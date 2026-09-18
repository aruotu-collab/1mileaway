import { prisma } from "@/lib/db";
import { APP_URL, CLAIM_STATUS } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { inboundCallHtml, sendEmail, subscribeFromDemandHtml } from "@/lib/email/adapter";
import { publicCallPhone } from "@/lib/phone";
import { inviteUnclaimedBusiness } from "@/lib/claim/invite";
import { marketplaceStats } from "@/lib/subscription";

async function areaName(locationId?: string) {
  if (!locationId) return "your area";
  const location = await prisma.location.findUnique({ where: { id: locationId } });
  return location?.name ?? "your area";
}

export async function startDirectCall(input: {
  businessId: string;
  professionId?: string;
  locationId?: string;
  skipBusinessIds?: string[];
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: { users: { include: { profile: true } }, subscription: true },
  });
  if (!business) throw new Error("Business not found");

  const phone = publicCallPhone({
    ...business,
    currentPeriodEnd: business.subscription?.currentPeriodEnd,
  });
  if (!phone) {
    return { call: null, reason: "no_direct_number" as const };
  }

  const call = await prisma.call.create({
    data: {
      businessId: input.businessId,
      toNumber: phone,
      status: "dialling",
      events: { create: { type: "direct_dial" } },
    },
  });

  const profession =
    input.professionId ??
    (await prisma.businessProfession.findFirst({ where: { businessId: input.businessId } }))?.professionId;

  if (profession) {
    await prisma.lead.create({
      data: {
        businessId: input.businessId,
        countryId: business.countryId,
        professionId: profession,
        locationId: input.locationId,
        callId: call.id,
        status: "CREATED",
      },
    });
  }

  if (input.skipBusinessIds?.length) {
    await prisma.callEvent.create({
      data: { callId: call.id, type: "skip_chain", payload: JSON.stringify(input.skipBusinessIds) },
    });
  }

  await writeAudit({
    action: "call.started",
    entityType: "call",
    entityId: call.id,
    metadata: { businessId: input.businessId, mode: "direct" },
  });

  const area = await areaName(input.locationId);
  const stats = await marketplaceStats(business.id);
  for (const user of business.users) {
    const email = user.profile?.email;
    if (!email) continue;
    await sendEmail({
      to: email,
      businessId: business.id,
      template: "inbound_call",
      subject: `A customer is calling you from 1mileaway (${stats.totalCalls} calls so far)`,
      html: inboundCallHtml({ businessName: business.name, area, phone, totalCalls: stats.totalCalls }),
    });
  }

  return { call, reason: null };
}

export async function requestTradesman(input: {
  businessId: string;
  professionId?: string;
  locationId?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: { users: { include: { profile: true } } },
  });
  if (!business) return { ok: false as const, reason: "missing" };

  const profession =
    input.professionId ??
    (await prisma.businessProfession.findFirst({ where: { businessId: input.businessId } }))?.professionId;

  if (profession) {
    await prisma.lead.create({
      data: {
        businessId: input.businessId,
        countryId: business.countryId,
        professionId: profession,
        locationId: input.locationId,
        status: "CREATED",
        qualification: "CUSTOMER_ASKED",
      },
    });
  }

  await writeAudit({
    action: "enquiry.requested",
    entityType: "business",
    entityId: business.id,
    metadata: { locationId: input.locationId },
  });

  if (business.claimStatus === CLAIM_STATUS.UNCLAIMED) {
    await inviteUnclaimedBusiness({
      businessId: business.id,
      locationId: input.locationId,
      professionId: profession,
      source: "lead",
    });
    return { ok: true as const };
  }

  const area = await areaName(input.locationId);
  const subscribeUrl = `${APP_URL}/professional/payments`;
  const stats = await marketplaceStats(business.id);
  const html = subscribeFromDemandHtml({
    businessName: business.name,
    area,
    subscribeUrl,
    totalCalls: stats.totalCalls,
  });
  for (const user of business.users) {
    const email = user.profile?.email;
    if (!email) continue;
    await sendEmail({
      to: email,
      businessId: business.id,
      template: "subscribe_from_demand",
      subject: `A customer in ${area} asked for you on 1mileaway`,
      html,
    });
  }
  if (business.users.length === 0 && business.contactEmail) {
    await sendEmail({
      to: business.contactEmail,
      businessId: business.id,
      template: "subscribe_from_demand",
      subject: `A customer in ${area} asked for you on 1mileaway`,
      html,
    });
  }

  return { ok: true as const };
}
