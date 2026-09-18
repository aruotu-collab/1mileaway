import { CALL_OUTCOME } from "@/lib/feedback";
import { CLAIM_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { startOfLocalDay } from "@/lib/utils";

export type TappedListing = {
  businessId: string;
  name: string;
  slug: string;
  country: string;
  trade: string;
  area: string;
  email: string | null;
  tapCount: number;
  lastAt: Date;
};

export type CallNowListing = TappedListing & {
  answered: number;
  noAnswer: number;
  waiting: number;
};

function tradeName(profession: { internalId: string; slugs: { name: string }[] } | null | undefined) {
  return profession?.slugs[0]?.name ?? profession?.internalId ?? "trade";
}

export async function customerTaps() {
  const dayStart = startOfLocalDay("Europe/London");

  const [asks, calls] = await Promise.all([
    prisma.lead.findMany({
      where: {
        callId: null,
        business: { deletedAt: null, claimStatus: CLAIM_STATUS.UNCLAIMED },
      },
      include: {
        business: { include: { country: true } },
        location: true,
        profession: { include: { slugs: { take: 1 } } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.call.findMany({
      include: {
        business: { include: { country: true, professions: { include: { profession: { include: { slugs: { take: 1 } } } } } } },
        lead: { include: { location: true, profession: { include: { slugs: { take: 1 } } } } },
        review: true,
      },
      orderBy: { startedAt: "desc" },
    }),
  ]);

  const unclaimed = new Map<string, TappedListing>();
  for (const ask of asks) {
    const current = unclaimed.get(ask.businessId);
    if (current) {
      current.tapCount += 1;
      continue;
    }
    unclaimed.set(ask.businessId, {
      businessId: ask.businessId,
      name: ask.business.name,
      slug: ask.business.slug,
      country: ask.business.country.iso2,
      trade: tradeName(ask.profession),
      area: ask.location?.name ?? "no area",
      email: ask.business.contactEmail,
      tapCount: 1,
      lastAt: ask.createdAt,
    });
  }

  const callNow = new Map<string, CallNowListing>();
  for (const call of calls) {
    const current = callNow.get(call.businessId);
    if (current) {
      current.tapCount += 1;
      if (call.status === CALL_OUTCOME.ANSWERED) current.answered += 1;
      else if (call.status === CALL_OUTCOME.NO_ANSWER) current.noAnswer += 1;
      else current.waiting += 1;
      continue;
    }
    callNow.set(call.businessId, {
      businessId: call.businessId,
      name: call.business.name,
      slug: call.business.slug,
      country: call.business.country.iso2,
      trade: tradeName(call.lead?.profession ?? call.business.professions[0]?.profession),
      area: call.lead?.location?.name ?? "no area",
      email: call.business.contactEmail,
      tapCount: 1,
      lastAt: call.startedAt,
      answered: call.status === CALL_OUTCOME.ANSWERED ? 1 : 0,
      noAnswer: call.status === CALL_OUTCOME.NO_ANSWER ? 1 : 0,
      waiting:
        call.status === CALL_OUTCOME.ANSWERED || call.status === CALL_OUTCOME.NO_ANSWER ? 0 : 1,
    });
  }

  return {
    unclaimedListings: [...unclaimed.values()],
    callNowListings: [...callNow.values()],
    askTaps: asks.length,
    askTapsToday: asks.filter((ask) => ask.createdAt >= dayStart).length,
    callTaps: calls.length,
    callTapsToday: calls.filter((call) => call.startedAt >= dayStart).length,
    calls,
  };
}
