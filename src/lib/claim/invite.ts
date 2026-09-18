import { prisma } from "@/lib/db";
import { APP_URL, CLAIM_STATUS, OUTREACH, PAYMENT_STATES, ROLES } from "@/lib/constants";
import { hashToken, randomToken } from "@/lib/utils";
import { sendEmail, claimInviteHtml, listingInviteHtml } from "@/lib/email/adapter";
import { writeAudit } from "@/lib/admin/audit";
import { isEmailSuppressed, markOutreachAfterInvite, unsubscribeUrl } from "@/lib/outreach/engine";
import { startListingTrial } from "@/lib/subscription";
import { replaceBusinessProfessions } from "@/lib/listings/professions";
import { uniqueProfessionIds } from "@/lib/professions";

async function createClaimInviteTokens(businessId: string) {
  const claimToken = randomToken();
  const availabilityToken = randomToken();
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await prisma.actionToken.createMany({
    data: [
      {
        purpose: "claim",
        businessId,
        tokenHash: hashToken(claimToken),
        expiresAt,
      },
      {
        purpose: "availability",
        businessId,
        tokenHash: hashToken(availabilityToken),
        expiresAt,
      },
    ],
  });
  return { claimToken, availabilityToken, claimUrl: `${APP_URL}/claim/${claimToken}` };
}

function tokenFromMetadata(metadata: string | null) {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as { claimToken?: string };
    return parsed.claimToken ?? null;
  } catch {
    return null;
  }
}

export async function claimUrlForListing(businessId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { entityId: businessId, action: { in: ["claim.link_issued", "claim.invited"] } },
    orderBy: { createdAt: "desc" },
    take: 8,
  });
  for (const log of logs) {
    const token = tokenFromMetadata(log.metadata);
    if (!token) continue;
    const row = await prisma.actionToken.findFirst({
      where: {
        businessId,
        purpose: "claim",
        usedAt: null,
        expiresAt: { gt: new Date() },
        tokenHash: hashToken(token),
      },
    });
    if (row) return `${APP_URL}/claim/${token}`;
  }
  const issued = await createClaimInviteTokens(businessId);
  await writeAudit({
    action: "claim.link_issued",
    entityType: "business",
    entityId: businessId,
    metadata: { claimToken: issued.claimToken, channel: "phone" },
  });
  return issued.claimUrl;
}

export async function inviteUnclaimedBusiness(input: {
  businessId: string;
  locationId?: string | null;
  professionId?: string | null;
  source?: "lead" | "self" | "claim_page";
  force?: boolean;
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: {
      users: true,
      locations: { include: { location: true } },
      professions: { include: { profession: { include: { slugs: true } } } },
    },
  });
  if (!business) return null;
  if (business.claimStatus !== CLAIM_STATUS.UNCLAIMED) return null;
  if (business.users.length > 0) return null;
  const contactEmail = business.contactEmail?.trim() || null;
  if (contactEmail) {
    const suppressed = await isEmailSuppressed(contactEmail);
    if (suppressed === "bounce" || suppressed === "dnc") return null;
    if (suppressed && input.source !== "lead") return null;
  }

  if (!input.force) {
    const recent = await prisma.actionToken.findFirst({
      where: {
        businessId: business.id,
        purpose: "claim",
        usedAt: null,
        createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      },
    });
    if (recent) return { claimToken: null, alreadyInvited: true as const };
  }

  const issued = await createClaimInviteTokens(business.id);
  const area =
    business.locations.find((row) => row.locationId === input.locationId)?.location.name ??
    business.locations[0]?.location.name ??
    "your area";
  const profession =
    business.professions[0]?.profession.slugs[0]?.name ??
    business.professions[0]?.profession.internalId ??
    "professional";

  if (!contactEmail) {
    await writeAudit({
      action: "claim.link_issued",
      entityType: "business",
      entityId: business.id,
      metadata: { claimToken: issued.claimToken, channel: "phone", area, profession },
    });
    return { claimToken: issued.claimToken, alreadyInvited: false as const, emailed: false as const };
  }

  const claimUrl = issued.claimUrl;
  const availableUrl = `${APP_URL}/action/availability?token=${issued.availabilityToken}&status=AVAILABLE_NOW`;
  const fromLead = input.source === "lead";
  const unsub = unsubscribeUrl(business.id, contactEmail);

  await sendEmail({
    to: contactEmail,
    businessId: business.id,
    template: "claim_invite",
    subject: fromLead
      ? `A customer in ${area} is looking for a ${profession}`
      : `Claim ${business.name} on 1mileaway`,
    html: fromLead
      ? claimInviteHtml({
          businessName: business.name,
          area,
          profession,
          claimUrl,
          availableUrl,
          unsubscribeUrl: unsub,
        })
      : listingInviteHtml({
          businessName: business.name,
          claimUrl,
          availableUrl,
          unsubscribeUrl: unsub,
        }),
    payload: { token: process.env.RESEND_API_KEY ? undefined : issued.claimToken },
  });

  await writeAudit({
    action: "claim.invited",
    entityType: "business",
    entityId: business.id,
    metadata: { area, profession, claimToken: issued.claimToken },
  });
  if (input.source !== "lead") {
    await markOutreachAfterInvite(business.id);
  }

  return { claimToken: issued.claimToken, alreadyInvited: false as const, emailed: true as const };
}

export async function completeClaim(input: {
  token: string;
  profileId: string;
  email: string;
  professionIds?: string[];
}) {
  const row = await prisma.actionToken.findUnique({
    where: { tokenHash: hashToken(input.token) },
    include: { business: true },
  });
  if (!row || row.purpose !== "claim" || row.usedAt || row.expiresAt < new Date()) {
    throw new Error("That claim link has expired.");
  }
  if (row.business.claimStatus !== CLAIM_STATUS.UNCLAIMED) {
    throw new Error("This listing is already claimed.");
  }
  const invitedEmail = row.business.contactEmail;
  if (invitedEmail && invitedEmail.toLowerCase() !== input.email.toLowerCase()) {
    throw new Error("Sign in with the work email this listing was invited to.");
  }

  await prisma.$transaction([
    prisma.actionToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await activateClaimedListing({ businessId: row.businessId, profileId: input.profileId });
  const professionIds = uniqueProfessionIds(input.professionIds ?? []);
  if (professionIds.length) {
    await replaceBusinessProfessions(row.businessId, professionIds);
  }

  await writeAudit({
    actorId: input.profileId,
    action: "claim.completed",
    entityType: "business",
    entityId: row.businessId,
    metadata: professionIds.length ? { professionIds } : undefined,
  });

  return row.businessId;
}

export async function activateClaimedListing(input: { businessId: string; profileId: string }) {
  await prisma.$transaction([
    prisma.business.update({
      where: { id: input.businessId },
      data: {
        claimStatus: CLAIM_STATUS.CLAIMED,
        outreachStatus: OUTREACH.COMPLETE,
        outreachNextAt: null,
        paymentState: PAYMENT_STATES.SUBSCRIPTION_TRIALING,
      },
    }),
    prisma.profile.update({
      where: { id: input.profileId },
      data: { role: ROLES.professional },
    }),
    prisma.businessUser.upsert({
      where: { businessId_profileId: { businessId: input.businessId, profileId: input.profileId } },
      create: { businessId: input.businessId, profileId: input.profileId, role: "owner" },
      update: { role: "owner" },
    }),
  ]);
  await startListingTrial(input.businessId);
}
