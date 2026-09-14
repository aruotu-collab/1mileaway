import { prisma } from "@/lib/db";
import { APP_URL, CLAIM_STATUS, OUTREACH } from "@/lib/constants";
import { hashToken, randomToken } from "@/lib/utils";
import { sendEmail } from "@/lib/email/adapter";
import { writeAudit } from "@/lib/admin/audit";
import { nextOutreachAfterSend, sequenceBlocked, shouldSendSequence } from "@/lib/outreach/schedule";

export function unsubscribeUrl(businessId: string, email: string) {
  return `${APP_URL}/action/unsubscribe?businessId=${businessId}&token=${hashToken(`unsub:${businessId}:${email.toLowerCase()}`)}`;
}

export async function isEmailSuppressed(email: string) {
  const row = await prisma.emailSuppression.findUnique({ where: { email: email.toLowerCase() } });
  return row?.reason ?? null;
}

export async function suppressEmail(input: { email: string; reason: string; businessId?: string | null }) {
  const email = input.email.toLowerCase();
  await prisma.emailSuppression.upsert({
    where: { email },
    create: { email, reason: input.reason, businessId: input.businessId ?? null },
    update: { reason: input.reason, businessId: input.businessId ?? null },
  });
  if (input.businessId) {
    await prisma.business.update({
      where: { id: input.businessId },
      data: {
        outreachStatus:
          input.reason === "bounce"
            ? OUTREACH.BOUNCED
            : input.reason === "dnc"
              ? OUTREACH.DO_NOT_CONTACT
              : OUTREACH.UNSUBSCRIBED,
        outreachNextAt: null,
      },
    });
  }
}

export async function markOutreachAfterInvite(businessId: string) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business || sequenceBlocked(business.outreachStatus) || business.outreachStep > 0) return;
  const next = nextOutreachAfterSend(business.outreachStep);
  await prisma.business.update({
    where: { id: businessId },
    data: { outreachStatus: next.status, outreachStep: next.step, outreachNextAt: next.nextAt },
  });
}

export async function processDueOutreach(input?: { ignoreSchedule?: boolean; limit?: number }) {
  const now = new Date();
  const due = await prisma.business.findMany({
    where: {
      deletedAt: null,
      claimStatus: CLAIM_STATUS.UNCLAIMED,
      contactEmail: { not: null },
      outreachStatus: { in: [OUTREACH.INVITE_SENT, OUTREACH.FOLLOWUP_1] },
      ...(input?.ignoreSchedule ? {} : { outreachNextAt: { lte: now } }),
    },
    include: {
      locations: { include: { location: true } },
      professions: { include: { profession: { include: { slugs: true } } } },
    },
    take: input?.limit ?? 50,
    orderBy: { outreachNextAt: "asc" },
  });

  let sent = 0;
  let skipped = 0;
  for (const business of due) {
    const email = business.contactEmail;
    if (!email || !shouldSendSequence(business.outreachStatus)) {
      skipped += 1;
      continue;
    }
    const blocked = await isEmailSuppressed(email);
    if (blocked) {
      await prisma.business.update({
        where: { id: business.id },
        data: {
          outreachStatus: blocked === "bounce" ? OUTREACH.BOUNCED : OUTREACH.UNSUBSCRIBED,
          outreachNextAt: null,
        },
      });
      skipped += 1;
      continue;
    }

    const claimToken = randomToken();
    const availabilityToken = randomToken();
    await prisma.actionToken.createMany({
      data: [
        {
          purpose: "claim",
          businessId: business.id,
          tokenHash: hashToken(claimToken),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
        {
          purpose: "availability",
          businessId: business.id,
          tokenHash: hashToken(availabilityToken),
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    const area = business.locations[0]?.location.name ?? "your area";
    const profession =
      business.professions[0]?.profession.slugs[0]?.name ??
      business.professions[0]?.profession.internalId ??
      "professional";
    const claimUrl = `${APP_URL}/claim/${claimToken}`;
    const unsub = unsubscribeUrl(business.id, email);
    const second = business.outreachStep === 1;
    await sendEmail({
      to: email,
      businessId: business.id,
      template: second ? "outreach_day3" : "outreach_day8",
      subject: second
        ? `Customers can't currently see whether ${business.name} is available`
        : `Claim ${business.name} and activate your free leads`,
      html: second
        ? `<p>Customers looking for a ${profession} around ${area} still cannot see whether <strong>${business.name}</strong> is available for new work.</p>
           <p><a href="${claimUrl}">Claim your listing free</a></p>
           <p><a href="${unsub}">Unsubscribe</a></p>`
        : `<p>Claim <strong>${business.name}</strong> on 1mileaway to activate your introductory customer leads and tell nearby customers when you are available.</p>
           <p>This is the last reminder.</p>
           <p><a href="${claimUrl}">Claim ${business.name}</a></p>
           <p><a href="${unsub}">Unsubscribe</a></p>`,
      payload: { token: process.env.RESEND_API_KEY ? undefined : claimToken },
    });

    const next = nextOutreachAfterSend(business.outreachStep);
    await prisma.business.update({
      where: { id: business.id },
      data: { outreachStatus: next.status, outreachStep: next.step, outreachNextAt: next.nextAt },
    });
    await writeAudit({
      action: "outreach.followup",
      entityType: "business",
      entityId: business.id,
      metadata: { step: next.step, status: next.status },
    });
    sent += 1;
  }

  return { sent, skipped, considered: due.length };
}
