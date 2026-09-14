import { prisma } from "@/lib/db";
import { AVAILABILITY, CHARGING, LEAD_STATUS, PAYMENT_STATES } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail, availabilityActionHtml, paymentRequestHtml } from "@/lib/email/adapter";
import { createCheckoutForLead } from "@/lib/payments/adapter";
import { formatMoney, hashToken, randomToken } from "@/lib/utils";
import { setAvailability } from "@/lib/availability/engine";

export async function resolveTrialAllowance(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { professions: true },
  });
  if (!business) throw new Error("Business not found");

  const configs = await prisma.trialConfig.findMany();
  const professionId = business.professions[0]?.professionId;
  const scored = configs
    .map((config) => {
      if (config.businessId === businessId) return { config, score: 4 };
      if (config.professionId && config.professionId === professionId && config.countryId === business.countryId) {
        return { config, score: 3 };
      }
      if (config.professionId && config.professionId === professionId && !config.countryId) {
        return { config, score: 2 };
      }
      if (config.countryId === business.countryId && !config.professionId) return { config, score: 1 };
      if (config.scope === "global") return { config, score: 0 };
      return null;
    })
    .filter((row): row is { config: (typeof configs)[number]; score: number } => Boolean(row))
    .sort((a, b) => b.score - a.score);

  return scored[0]?.config.freeLeads ?? 5;
}

export async function snapshotLeadPrice(countryId: string, professionId: string) {
  const prices = await prisma.leadPrice.findMany({
    where: {
      countryId,
      active: true,
      OR: [{ professionId }, { professionId: null }],
    },
    orderBy: { effectiveFrom: "desc" },
  });
  const specific = prices.find((p) => p.professionId === professionId);
  return specific ?? prices.find((p) => !p.professionId) ?? null;
}

export async function rejectLead(leadId: string, reason = "MISSED") {
  const lead = await prisma.lead.findUnique({ where: { id: leadId }, include: { call: true } });
  if (!lead) throw new Error("Lead not found");
  if (lead.status === LEAD_STATUS.QUALIFIED || lead.status === LEAD_STATUS.SETTLED) {
    return lead;
  }
  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { status: LEAD_STATUS.DISQUALIFIED, qualification: reason },
  });
  if (lead.callId) {
    await prisma.call.update({
      where: { id: lead.callId },
      data: { status: "missed", endedAt: new Date(), events: { create: { type: "missed" } } },
    });
  }
  return updated;
}

export async function qualifyLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      call: true,
      business: { include: { trialBalance: true, users: { include: { profile: true } } } },
    },
  });
  if (!lead) throw new Error("Lead not found");
  if (lead.status === LEAD_STATUS.QUALIFIED || lead.status === LEAD_STATUS.SETTLED) return lead;

  if (lead.callId) {
    await prisma.call.update({
      where: { id: lead.callId },
      data: {
        status: "completed",
        endedAt: new Date(),
        events: { create: { type: "connected" } },
      },
    });
  }

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUniqueOrThrow({
      where: { id: lead.businessId },
      include: { trialBalance: true },
    });
    const open = await tx.outstandingLeadBalance.findFirst({
      where: { businessId: business.id, status: "OPEN" },
    });
    if (open) {
      throw new Error("Outstanding lead already exists");
    }

    let chargingMode: string = CHARGING.PAID;
    const remaining = business.trialBalance?.remaining ?? 0;

    if (remaining > 0) {
      chargingMode = CHARGING.FREE_TRIAL;
      await tx.trialBalance.update({
        where: { businessId: business.id },
        data: { remaining: remaining - 1, used: { increment: 1 } },
      });
      await tx.business.update({
        where: { id: business.id },
        data: {
          paymentState:
            remaining - 1 === 0 ? PAYMENT_STATES.TRUST_LEAD_AVAILABLE : PAYMENT_STATES.FREE_TRIAL_ACTIVE,
        },
      });
    } else if (
      business.paymentState === PAYMENT_STATES.TRUST_LEAD_AVAILABLE ||
      business.paymentState === PAYMENT_STATES.FREE_TRIAL_EXHAUSTED ||
      business.paymentState === PAYMENT_STATES.PAID_ELIGIBLE
    ) {
      chargingMode = CHARGING.TRUST_LEAD;
      const price = await snapshotLeadPrice(business.countryId, lead.professionId);
      if (!price) throw new Error("No lead price configured");
      await tx.outstandingLeadBalance.create({
        data: {
          businessId: business.id,
          leadId: lead.id,
          amountMinor: price.amountMinor,
          currency: price.currency,
        },
      });
      await tx.lead.update({
        where: { id: lead.id },
        data: { priceMinor: price.amountMinor, currency: price.currency },
      });
      await tx.business.update({
        where: { id: business.id },
        data: { paymentState: PAYMENT_STATES.OUTSTANDING_LEAD },
      });
    } else {
      throw new Error("Professional is not eligible for a new paid lead");
    }

    const updated = await tx.lead.update({
      where: { id: lead.id },
      data: {
        status: LEAD_STATUS.QUALIFIED,
        qualification: "CONNECTED",
        chargingMode,
        qualifiedAt: new Date(),
      },
    });
    return { lead: updated, chargingMode, businessId: business.id };
  }).then(async (result) => {
    await writeAudit({
      action: "lead.qualified",
      entityType: "lead",
      entityId: result.lead.id,
      metadata: { chargingMode: result.chargingMode },
    });

    const owner = lead.business.users[0]?.profile;
    if (owner) {
      const token = randomToken();
      await prisma.actionToken.create({
        data: {
          purpose: "availability",
          businessId: lead.businessId,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      if (result.chargingMode === CHARGING.FREE_TRIAL) {
        await sendEmail({
          to: owner.email,
          businessId: lead.businessId,
          template: "lead_qualified",
          subject: "New qualified lead — still available?",
          html: `<p>A customer was connected through 1mileaway.</p>${availabilityActionHtml(token)}`,
        });
      } else {
        const checkout = await createCheckoutForLead(result.lead.id);
        const amount = formatMoney(result.lead.priceMinor ?? 0, result.lead.currency ?? "GBP");
        await sendEmail({
          to: owner.email,
          businessId: lead.businessId,
          template: "payment_request",
          subject: "Settle this lead to continue",
          html: paymentRequestHtml(checkout.url, amount),
        });
        await setAvailability({
          businessId: lead.businessId,
          status: AVAILABILITY.UNKNOWN,
          source: "outstanding_lead",
        });
      }
    }
    return result.lead;
  });
}

export async function canReceivePaidLeads(paymentState: string) {
  return (
    paymentState === PAYMENT_STATES.FREE_TRIAL_ACTIVE ||
    paymentState === PAYMENT_STATES.TRUST_LEAD_AVAILABLE ||
    paymentState === PAYMENT_STATES.PAID_ELIGIBLE
  );
}
