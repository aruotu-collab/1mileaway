import { prisma } from "@/lib/db";
import {
  AVAILABILITY,
  CHARGING,
  LEAD_STATUS,
  PAYMENT_STATES,
  QUALIFIED_CALL_SECONDS,
} from "@/lib/constants";
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

export async function qualifyCall(callId: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { lead: true, business: { include: { trialBalance: true, users: { include: { profile: true } } } } },
  });
  if (!call) throw new Error("Call not found");
  if (call.lead?.status === LEAD_STATUS.QUALIFIED) return call.lead;
  if (call.durationSeconds < QUALIFIED_CALL_SECONDS) {
    if (call.lead) {
      await prisma.lead.update({
        where: { id: call.lead.id },
        data: { status: LEAD_STATUS.DISQUALIFIED, qualification: "BELOW_THRESHOLD" },
      });
    }
    return null;
  }

  const lead =
    call.lead ??
    (await prisma.lead.create({
      data: {
        businessId: call.businessId,
        countryId: call.business.countryId,
        professionId: (
          await prisma.businessProfession.findFirst({ where: { businessId: call.businessId } })
        )?.professionId ?? (await prisma.profession.findFirstOrThrow()).id,
        callId: call.id,
        visitorPhone: call.fromNumber,
        status: LEAD_STATUS.CREATED,
      },
    }));

  return prisma.$transaction(async (tx) => {
    const business = await tx.business.findUniqueOrThrow({
      where: { id: call.businessId },
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

    const owner = call.business.users[0]?.profile;
    if (owner) {
      const token = randomToken();
      await prisma.actionToken.create({
        data: {
          purpose: "availability",
          businessId: call.businessId,
          tokenHash: hashToken(token),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      });
      if (result.chargingMode === CHARGING.FREE_TRIAL) {
        await sendEmail({
          to: owner.email,
          businessId: call.businessId,
          template: "lead_qualified",
          subject: "New qualified lead — still available?",
          html: `<p>A customer was connected through 1mileaway.</p>${availabilityActionHtml(token)}`,
        });
      } else {
        const checkout = await createCheckoutForLead(result.lead.id);
        const amount = formatMoney(result.lead.priceMinor ?? 0, result.lead.currency ?? "GBP");
        await sendEmail({
          to: owner.email,
          businessId: call.businessId,
          template: "payment_request",
          subject: "Settle this lead to continue",
          html: paymentRequestHtml(checkout.url, amount),
        });
        await setAvailability({
          businessId: call.businessId,
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
