import { CLAIM_STATUS, PAYMENT_STATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { publicCallPhone } from "@/lib/phone";
import { minutesAgo, startOfLocalDay } from "@/lib/utils";

export type ActivitySnapshot = {
  callsLastHour: number;
  callsTodayLocal: number;
  callsTodaySite: number;
  asksToday: number;
  availableNow: number;
  listingCount: number;
  professionName: string;
  professionPlural: string;
  locationName: string;
};

function countLabel(count: number, one: string, many: string) {
  return `${count} ${count === 1 ? one : many}`;
}

export type TradeClaimCounts = {
  name: string;
  plural: string;
  claimed: number;
  unclaimed: number;
};

export type SiteActivitySnapshot = {
  callsLastHour: number;
  callsToday: number;
  callsAllTime: number;
  lastCallAt: Date | null;
  asksToday: number;
  unclaimedAsksToday: number;
  unclaimedAsksAllTime: number;
  availableNow: number;
  listingCount: number;
  claimedCount: number;
  unclaimedCount: number;
  callNowOnCount: number;
  verifiedCount: number;
  trialCount: number;
  listedThisWeek: number;
  reviewCount: number;
  areaCount: number;
  professionCount: number;
  trades: TradeClaimCounts[];
};

export function activityHeadlines(snap: ActivitySnapshot) {
  const trade = snap.professionPlural.toLowerCase();
  const one = snap.professionName.toLowerCase();
  const area = snap.locationName;
  const lines: string[] = [];

  if (snap.callsLastHour > 0) {
    lines.push(countLabel(snap.callsLastHour, "customer is ringing a tradesman now", "customers are ringing tradesmen now"));
  }
  if (snap.callsTodayLocal > 0) {
    lines.push(
      countLabel(snap.callsTodayLocal, `Call now tap in ${area} today`, `Call now taps in ${area} today`),
    );
  }
  if (snap.callsTodaySite > 0 && snap.callsTodaySite !== snap.callsTodayLocal) {
    lines.push(countLabel(snap.callsTodaySite, "Call now tap on 1mileaway today", "Call now taps on 1mileaway today"));
  }
  if (snap.asksToday > 0) {
    lines.push(countLabel(snap.asksToday, "tradesman was asked to take a job today", "tradesmen were asked to take a job today"));
  }
  if (snap.availableNow > 0) {
    lines.push(countLabel(snap.availableNow, `${one} recently available in ${area}`, `${trade} recently available in ${area}`));
  }
  if (snap.listingCount > 0) {
    lines.push(`${snap.listingCount} ${trade} serve ${area}`);
  }

  return lines;
}

export async function activitySnapshot(input: {
  countryId: string;
  timezone: string;
  professionId: string;
  locationId: string;
  professionName: string;
  professionPlural: string;
  locationName: string;
  availableNow: number;
  listingCount: number;
}): Promise<ActivitySnapshot> {
  const dayStart = startOfLocalDay(input.timezone);
  const hourStart = new Date(Date.now() - 60 * 60 * 1000);
  const [callsLastHour, callsTodayLocal, callsTodaySite, asksToday] = await Promise.all([
    prisma.call.count({ where: { startedAt: { gte: hourStart } } }),
    prisma.call.count({
      where: {
        startedAt: { gte: dayStart },
        lead: { is: { professionId: input.professionId, locationId: input.locationId } },
      },
    }),
    prisma.call.count({
      where: { startedAt: { gte: dayStart }, business: { countryId: input.countryId } },
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: dayStart },
        callId: null,
        professionId: input.professionId,
        locationId: input.locationId,
      },
    }),
  ]);

  return {
    callsLastHour,
    callsTodayLocal,
    callsTodaySite,
    asksToday,
    availableNow: input.availableNow,
    listingCount: input.listingCount,
    professionName: input.professionName,
    professionPlural: input.professionPlural,
    locationName: input.locationName,
  };
}

function claimedLabel(count: number) {
  return countLabel(count, "claimed listing", "claimed listings");
}

function unclaimedLabel(count: number) {
  return countLabel(count, "listing not yet claimed", "listings not yet claimed");
}

export function tradeClaimHeadline(trade: TradeClaimCounts) {
  const listed = trade.claimed + trade.unclaimed;
  const word = (count: number) => (count === 1 ? trade.name : trade.plural).toLowerCase();
  if (trade.claimed > 0 && trade.unclaimed > 0) {
    return `${trade.claimed} claimed ${word(trade.claimed)} · ${trade.unclaimed} not yet claimed`;
  }
  if (trade.claimed === 0 && trade.unclaimed > 0) {
    return `${trade.unclaimed} ${word(listed)} listed — none claimed yet, so Call now is off`;
  }
  if (trade.claimed > 0) {
    return `${trade.claimed} claimed ${word(trade.claimed)} with Call now on`;
  }
  return null;
}

function recentCallHeadline(lastCallAt: Date | null) {
  const mins = minutesAgo(lastCallAt);
  if (mins == null) return null;
  if (mins <= 1) return "A customer tapped Call now just now";
  if (mins < 60) return `Most recent Call now tap was ${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Most recent Call now tap was ${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  return null;
}

export function siteActivityHeadlines(snap: SiteActivitySnapshot) {
  const lines: string[] = [];
  if (snap.callsLastHour > 0) {
    lines.push(countLabel(snap.callsLastHour, "customer is ringing a tradesman now", "customers are ringing tradesmen now"));
  }
  const recent = recentCallHeadline(snap.lastCallAt);
  if (recent) lines.push(recent);
  if (snap.callsToday > 0) {
    lines.push(countLabel(snap.callsToday, "Call now tap on 1mileaway today", "Call now taps on 1mileaway today"));
  }
  if (snap.callsAllTime > 0 && snap.callsAllTime !== snap.callsToday) {
    lines.push(`${snap.callsAllTime} Call now taps through the web app so far`);
  }
  if (snap.unclaimedAsksToday > 0) {
    lines.push(
      countLabel(
        snap.unclaimedAsksToday,
        "customer asked an unclaimed listing today — they could not get through",
        "customers asked unclaimed listings today — they could not get through",
      ),
    );
  } else if (snap.asksToday > 0) {
    lines.push(countLabel(snap.asksToday, "tradesman was asked to take a job today", "tradesmen were asked to take a job today"));
  }
  if (snap.unclaimedAsksAllTime > 0 && snap.unclaimedAsksAllTime !== snap.unclaimedAsksToday) {
    lines.push(
      `${snap.unclaimedAsksAllTime} customers have asked unclaimed listings and could not tap Call now`,
    );
  }
  if (snap.availableNow > 0) {
    lines.push(countLabel(snap.availableNow, "professional recently available", "professionals recently available"));
  }
  if (snap.callNowOnCount > 0) {
    lines.push(countLabel(snap.callNowOnCount, "listing has Call now on", "listings have Call now on"));
  }
  if (snap.claimedCount > 0 || snap.unclaimedCount > 0) {
    lines.push(`${claimedLabel(snap.claimedCount)} · ${unclaimedLabel(snap.unclaimedCount)}`);
  } else if (snap.listingCount > 0) {
    lines.push(`${snap.listingCount} professionals listed on 1mileaway`);
  }
  if (snap.unclaimedCount > 0) {
    lines.push("Unclaimed listings are in search, but Call now stays off until they are claimed");
  }
  if (snap.listedThisWeek > 0) {
    lines.push(countLabel(snap.listedThisWeek, "new listing this week", "new listings this week"));
  }
  if (snap.verifiedCount > 0) {
    lines.push(countLabel(snap.verifiedCount, "verified professional", "verified professionals"));
  }
  if (snap.trialCount > 0) {
    lines.push(`${snap.trialCount} ${snap.trialCount === 1 ? "listing is" : "listings are"} on a two-month free trial`);
  }
  if (snap.reviewCount > 0) {
    lines.push(countLabel(snap.reviewCount, "review from a real 1mileaway call", "reviews from real 1mileaway calls"));
  }
  for (const trade of snap.trades) {
    const line = tradeClaimHeadline(trade);
    if (line) lines.push(line);
  }
  if (snap.professionCount > 0) {
    lines.push(`${snap.professionCount} types of help nearby`);
  }
  if (snap.areaCount > 0) {
    lines.push(`${snap.areaCount} areas you can search`);
  }
  return lines;
}

export async function siteActivitySnapshot(): Promise<SiteActivitySnapshot> {
  const country = await prisma.country.findFirst({
    where: { active: true },
    orderBy: { tier: "asc" },
    select: { id: true, timezone: true },
  });
  const timezone = country?.timezone ?? "Europe/London";
  const countryId = country?.id;
  const dayStart = startOfLocalDay(timezone);
  const hourStart = new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();
  const listed = {
    deletedAt: null,
    claimStatus: { not: CLAIM_STATUS.SUSPENDED },
    ...(countryId ? { countryId } : {}),
  };
  const inCountry = countryId ? { business: { countryId } } : {};

  const [
    callsLastHour,
    callsToday,
    callsAllTime,
    lastCall,
    asksToday,
    unclaimedAsksToday,
    unclaimedAsksAllTime,
    availableNow,
    areaCount,
    professionCount,
    reviewCount,
    businesses,
    slugs,
  ] = await Promise.all([
    prisma.call.count({ where: { startedAt: { gte: hourStart }, ...inCountry } }),
    prisma.call.count({ where: { startedAt: { gte: dayStart }, ...inCountry } }),
    prisma.call.count({ where: inCountry }),
    prisma.call.findFirst({
      where: inCountry,
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
    prisma.lead.count({
      where: { createdAt: { gte: dayStart }, callId: null, ...(countryId ? { countryId } : {}) },
    }),
    prisma.lead.count({
      where: {
        createdAt: { gte: dayStart },
        callId: null,
        business: { ...listed, claimStatus: CLAIM_STATUS.UNCLAIMED },
      },
    }),
    prisma.lead.count({
      where: {
        callId: null,
        business: { ...listed, claimStatus: CLAIM_STATUS.UNCLAIMED },
      },
    }),
    prisma.businessAvailability.count({
      where: {
        status: "AVAILABLE_NOW",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        business: listed,
      },
    }),
    prisma.location.count({
      where: { active: true, type: { in: ["district", "city"] }, ...(countryId ? { countryId } : {}) },
    }),
    prisma.professionSlug.count({
      where: { ...(countryId ? { countryId } : {}), profession: { active: true } },
    }),
    prisma.review.count({
      where: { published: true, ...(countryId ? { business: { countryId } } : {}) },
    }),
    prisma.business.findMany({
      where: listed,
      select: {
        claimStatus: true,
        paymentState: true,
        phoneReal: true,
        createdAt: true,
        professions: { select: { professionId: true } },
        subscription: { select: { currentPeriodEnd: true } },
      },
    }),
    prisma.professionSlug.findMany({
      where: { ...(countryId ? { countryId } : {}), profession: { active: true } },
      select: { professionId: true, name: true, pluralName: true },
    }),
  ]);

  const names = new Map(slugs.map((row) => [row.professionId, { name: row.name, plural: row.pluralName }]));
  const byTrade = new Map<string, TradeClaimCounts>();
  let claimedCount = 0;
  let unclaimedCount = 0;
  let callNowOnCount = 0;
  let verifiedCount = 0;
  let trialCount = 0;
  let listedThisWeek = 0;
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const business of businesses) {
    const claimed =
      business.claimStatus === CLAIM_STATUS.CLAIMED || business.claimStatus === CLAIM_STATUS.VERIFIED;
    if (business.claimStatus === CLAIM_STATUS.UNCLAIMED) unclaimedCount += 1;
    else if (claimed) claimedCount += 1;
    if (business.claimStatus === CLAIM_STATUS.VERIFIED) verifiedCount += 1;
    if (business.createdAt >= weekStart) listedThisWeek += 1;
    if (
      publicCallPhone({
        claimStatus: business.claimStatus,
        paymentState: business.paymentState,
        phoneReal: business.phoneReal,
        currentPeriodEnd: business.subscription?.currentPeriodEnd,
      })
    ) {
      callNowOnCount += 1;
    }
    if (
      business.paymentState === PAYMENT_STATES.FREE_TRIAL_ACTIVE ||
      business.paymentState === PAYMENT_STATES.SUBSCRIPTION_TRIALING
    ) {
      trialCount += 1;
    }
    for (const row of business.professions) {
      const labels = names.get(row.professionId);
      if (!labels) continue;
      const current = byTrade.get(row.professionId) ?? { ...labels, claimed: 0, unclaimed: 0 };
      if (business.claimStatus === CLAIM_STATUS.UNCLAIMED) current.unclaimed += 1;
      else if (claimed) current.claimed += 1;
      byTrade.set(row.professionId, current);
    }
  }

  const trades = [...byTrade.values()]
    .filter((row) => row.claimed + row.unclaimed > 0)
    .sort((a, b) => b.unclaimed - a.unclaimed || b.claimed - a.claimed || a.plural.localeCompare(b.plural));

  return {
    callsLastHour,
    callsToday,
    callsAllTime,
    lastCallAt: lastCall?.startedAt ?? null,
    asksToday,
    unclaimedAsksToday,
    unclaimedAsksAllTime,
    availableNow,
    listingCount: businesses.length,
    claimedCount,
    unclaimedCount,
    callNowOnCount,
    verifiedCount,
    trialCount,
    listedThisWeek,
    reviewCount,
    areaCount,
    professionCount,
    trades,
  };
}
