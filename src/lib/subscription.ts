import { APP_URL, PAYMENT_STATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import {
  sendEmail,
  trialStartedHtml,
  trialStatsHtml,
  type EmailTemplate,
} from "@/lib/email/adapter";
import { formatLocalDateTime, formatMoney } from "@/lib/utils";
import type { MarketplaceStats } from "@/lib/listing-insights";

export type { MarketplaceStats } from "@/lib/listing-insights";

export const SUBSCRIPTION_AMOUNT_MINOR = Number(process.env.SUBSCRIPTION_AMOUNT_MINOR ?? 2900);
export const SUBSCRIPTION_CURRENCY = (process.env.SUBSCRIPTION_CURRENCY ?? "GBP").toUpperCase();
export const TRIAL_MONTHS = 2;

export function isSubscriptionActive(paymentState: string, periodEnd?: Date | null) {
  if (paymentState === PAYMENT_STATES.SUBSCRIPTION_ACTIVE) return true;
  if (paymentState !== PAYMENT_STATES.SUBSCRIPTION_TRIALING) return false;
  if (!periodEnd) return true;
  return periodEnd.getTime() > Date.now();
}

export function isTrialing(paymentState: string, periodEnd?: Date | null) {
  return paymentState === PAYMENT_STATES.SUBSCRIPTION_TRIALING && isSubscriptionActive(paymentState, periodEnd);
}

export function subscriptionPriceLabel() {
  return `${formatMoney(SUBSCRIPTION_AMOUNT_MINOR, SUBSCRIPTION_CURRENCY)} a month`;
}

export function trialEndFrom(now = new Date()) {
  const end = new Date(now);
  end.setMonth(end.getMonth() + TRIAL_MONTHS);
  return end;
}

export function daysRemaining(periodEnd?: Date | null, now = new Date()) {
  if (!periodEnd) return null;
  return Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
}

async function hasTemplate(businessId: string, template: EmailTemplate) {
  const row = await prisma.emailMessage.findFirst({ where: { businessId, template } });
  return Boolean(row);
}

async function emailOwners(
  businessId: string,
  template: EmailTemplate,
  subject: string,
  html: string,
) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: { users: { include: { profile: true } } },
  });
  if (!business) return;
  for (const user of business.users) {
    const email = user.profile?.email;
    if (!email) continue;
    await sendEmail({ to: email, businessId, template, subject, html });
  }
}

export async function startListingTrial(businessId: string) {
  const currentPeriodEnd = trialEndFrom();
  await prisma.$transaction([
    prisma.business.update({
      where: { id: businessId },
      data: { paymentState: PAYMENT_STATES.SUBSCRIPTION_TRIALING },
    }),
    prisma.subscription.upsert({
      where: { businessId },
      create: {
        businessId,
        status: "trialing",
        amountMinor: SUBSCRIPTION_AMOUNT_MINOR,
        currency: SUBSCRIPTION_CURRENCY,
        currentPeriodEnd,
        provider: "trial",
      },
      update: {
        status: "trialing",
        amountMinor: SUBSCRIPTION_AMOUNT_MINOR,
        currency: SUBSCRIPTION_CURRENCY,
        currentPeriodEnd,
        provider: "trial",
      },
    }),
  ]);

  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (business && !(await hasTemplate(businessId, "trial_started"))) {
    await emailOwners(
      businessId,
      "trial_started",
      "Your 2-month 1mileaway trial is on — we will count every call",
      trialStartedHtml({
        businessName: business.name,
        trialEndLabel: formatLocalDateTime(currentPeriodEnd),
        priceLabel: subscriptionPriceLabel(),
      }),
    );
  }
  return currentPeriodEnd;
}

export async function marketplaceStats(businessId: string): Promise<MarketplaceStats> {
  const start7 = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const start30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const asked = { businessId, callId: null as string | null };
  const [totalCalls, callsLast7, callsLast30, asks, asksLast30, lastCall, lastAsk, review] = await Promise.all([
    prisma.call.count({ where: { businessId } }),
    prisma.call.count({ where: { businessId, startedAt: { gte: start7 } } }),
    prisma.call.count({ where: { businessId, startedAt: { gte: start30 } } }),
    prisma.lead.count({ where: asked }),
    prisma.lead.count({ where: { ...asked, createdAt: { gte: start30 } } }),
    prisma.call.findFirst({
      where: { businessId },
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.lead.findFirst({
      where: asked,
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.review.aggregate({
      where: { businessId, published: true },
      _count: { _all: true },
      _avg: { rating: true },
    }),
  ]);
  return {
    totalCalls,
    callsLast7,
    callsLast30,
    asks,
    asksLast30,
    lastCallAt: lastCall?.startedAt ?? null,
    lastAskAt: lastAsk?.createdAt ?? null,
    reviewCount: review._count._all,
    ratingAvg: review._avg.rating ?? 0,
  };
}

function statsEmail(input: {
  heading: string;
  businessName: string;
  stats: MarketplaceStats;
  daysLeft?: number | null;
  ctaLabel: string;
}) {
  return trialStatsHtml({
    heading: input.heading,
    businessName: input.businessName,
    totalCalls: input.stats.totalCalls,
    callsLast30: input.stats.callsLast30,
    asks: input.stats.asks,
    daysLeft: input.daysLeft,
    priceLabel: subscriptionPriceLabel(),
    ctaLabel: input.ctaLabel,
    ctaUrl: `${APP_URL}/professional/payments`,
  });
}

export async function expireEndedTrials(now = new Date()) {
  const ended = await prisma.subscription.findMany({
    where: {
      status: "trialing",
      currentPeriodEnd: { lte: now },
      business: { paymentState: PAYMENT_STATES.SUBSCRIPTION_TRIALING },
    },
    include: { business: { include: { users: { include: { profile: true } } } } },
  });

  for (const row of ended) {
    const stats = await marketplaceStats(row.businessId);
    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: row.id },
        data: { status: "trial_ended" },
      }),
      prisma.business.update({
        where: { id: row.businessId },
        data: { paymentState: PAYMENT_STATES.UNSUBSCRIBED },
      }),
    ]);
    await emailOwners(
      row.businessId,
      "trial_ended",
      `Your 2-month 1mileaway trial has ended — ${stats.totalCalls} calls were sent`,
      statsEmail({
        heading: `Your free trial for <strong>${row.business.name}</strong> has ended.`,
        businessName: row.business.name,
        stats,
        ctaLabel: "See your numbers and subscribe",
      }),
    );
  }
  return { expired: ended.length };
}

export async function sendTrialProgressEmails(now = new Date()) {
  const live = await prisma.subscription.findMany({
    where: {
      status: "trialing",
      currentPeriodEnd: { gt: now },
      business: { paymentState: PAYMENT_STATES.SUBSCRIPTION_TRIALING },
    },
    include: { business: true },
  });

  let checkins = 0;
  let endings = 0;
  for (const row of live) {
    const daysLeft = daysRemaining(row.currentPeriodEnd, now);
    if (daysLeft == null) continue;
    const stats = await marketplaceStats(row.businessId);

    if (daysLeft <= 8) {
      if (await hasTemplate(row.businessId, "trial_ending")) continue;
      await emailOwners(
        row.businessId,
        "trial_ending",
        `Your 1mileaway trial ends in ${daysLeft} days — ${stats.totalCalls} calls so far`,
        statsEmail({
          heading: `Your free trial for <strong>${row.business.name}</strong> is almost over.`,
          businessName: row.business.name,
          stats,
          daysLeft,
          ctaLabel: `Continue for ${subscriptionPriceLabel()}`,
        }),
      );
      endings += 1;
      continue;
    }

    if (daysLeft <= 40 && daysLeft >= 20) {
      if (await hasTemplate(row.businessId, "trial_checkin")) continue;
      await emailOwners(
        row.businessId,
        "trial_checkin",
        `Halfway through your 1mileaway trial — ${stats.totalCalls} calls so far`,
        statsEmail({
          heading: `You are halfway through the free trial for <strong>${row.business.name}</strong>.`,
          businessName: row.business.name,
          stats,
          daysLeft,
          ctaLabel: "See your call statistics",
        }),
      );
      checkins += 1;
    }
  }

  return { checkins, endings };
}

export async function runSubscriptionJobs(now = new Date()) {
  const expired = await expireEndedTrials(now);
  const progress = await sendTrialProgressEmails(now);
  return { ...expired, ...progress };
}
