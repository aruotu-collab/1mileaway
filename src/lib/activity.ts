import { CLAIM_STATUS, PAYMENT_STATES } from "@/lib/constants";
import type { UiLanguage } from "@/lib/countries/catalog";
import { prisma } from "@/lib/db";
import { countLine, fillTape, tapeCopy, type TapeCopy } from "@/lib/i18n/tape";
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

function copyFor(language: UiLanguage = "en") {
  return tapeCopy(language);
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

export function activityHeadlines(snap: ActivitySnapshot, language: UiLanguage = "en") {
  const copy = copyFor(language);
  const trade = snap.professionPlural.toLowerCase();
  const one = snap.professionName.toLowerCase();
  const area = snap.locationName;
  const lines: string[] = [];

  if (snap.callsLastHour > 0) {
    lines.push(countLine(snap.callsLastHour, copy.ringingOne, copy.ringingMany));
  }
  if (snap.callsTodayLocal > 0) {
    lines.push(countLine(snap.callsTodayLocal, copy.tapsInAreaOne, copy.tapsInAreaMany, { area }));
  }
  if (snap.callsTodaySite > 0 && snap.callsTodaySite !== snap.callsTodayLocal) {
    lines.push(countLine(snap.callsTodaySite, copy.tapsTodayOne, copy.tapsTodayMany));
  }
  if (snap.asksToday > 0) {
    lines.push(countLine(snap.asksToday, copy.askedJobOne, copy.askedJobMany));
  }
  if (snap.availableNow > 0) {
    lines.push(countLine(snap.availableNow, copy.availableInAreaOne, copy.availableInAreaMany, { one, trade, area }));
  }
  if (snap.listingCount > 0) {
    lines.push(fillTape(copy.serveArea, { n: snap.listingCount, trade, area }));
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

function claimedLabel(count: number, copy: TapeCopy) {
  return countLine(count, copy.claimedOne, copy.claimedMany);
}

function unclaimedLabel(count: number, copy: TapeCopy) {
  return countLine(count, copy.unclaimedListingOne, copy.unclaimedListingMany);
}

export function tradeClaimHeadline(trade: TradeClaimCounts, language: UiLanguage = "en") {
  const copy = copyFor(language);
  const listed = trade.claimed + trade.unclaimed;
  const word = (count: number) => (count === 1 ? trade.name : trade.plural).toLowerCase();
  if (trade.claimed > 0 && trade.unclaimed > 0) {
    return fillTape(copy.tradeClaimedBoth, {
      claimed: trade.claimed,
      word: word(trade.claimed),
      unclaimed: trade.unclaimed,
    });
  }
  if (trade.claimed === 0 && trade.unclaimed > 0) {
    return fillTape(copy.tradeUnclaimed, { n: trade.unclaimed, word: word(listed) });
  }
  if (trade.claimed > 0) {
    return fillTape(copy.tradeClaimedOn, { n: trade.claimed, word: word(trade.claimed) });
  }
  return null;
}

function recentCallHeadline(lastCallAt: Date | null, copy: TapeCopy) {
  const mins = minutesAgo(lastCallAt);
  if (mins == null) return null;
  if (mins <= 1) return copy.callNowJustNow;
  if (mins < 60) return fillTape(copy.callNowMinutes, { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return countLine(hours, copy.callNowHour, copy.callNowHours);
  return null;
}

export function siteActivityHeadlines(snap: SiteActivitySnapshot, language: UiLanguage = "en") {
  const copy = copyFor(language);
  const lines: string[] = [];
  if (snap.callsLastHour > 0) {
    lines.push(countLine(snap.callsLastHour, copy.ringingOne, copy.ringingMany));
  }
  const recent = recentCallHeadline(snap.lastCallAt, copy);
  if (recent) lines.push(recent);
  if (snap.callsToday > 0) {
    lines.push(countLine(snap.callsToday, copy.tapsTodayOne, copy.tapsTodayMany));
  }
  if (snap.callsAllTime > 0 && snap.callsAllTime !== snap.callsToday) {
    lines.push(fillTape(copy.tapsAllTime, { n: snap.callsAllTime }));
  }
  if (snap.unclaimedAsksToday > 0) {
    lines.push(countLine(snap.unclaimedAsksToday, copy.unclaimedAskTodayOne, copy.unclaimedAskTodayMany));
  } else if (snap.asksToday > 0) {
    lines.push(countLine(snap.asksToday, copy.askedJobOne, copy.askedJobMany));
  }
  if (snap.unclaimedAsksAllTime > 0 && snap.unclaimedAsksAllTime !== snap.unclaimedAsksToday) {
    lines.push(fillTape(copy.unclaimedAskAllTime, { n: snap.unclaimedAsksAllTime }));
  }
  if (snap.availableNow > 0) {
    lines.push(countLine(snap.availableNow, copy.availableOne, copy.availableMany));
  }
  if (snap.callNowOnCount > 0) {
    lines.push(countLine(snap.callNowOnCount, copy.callNowOnOne, copy.callNowOnMany));
  }
  if (snap.claimedCount > 0 || snap.unclaimedCount > 0) {
    lines.push(`${claimedLabel(snap.claimedCount, copy)} · ${unclaimedLabel(snap.unclaimedCount, copy)}`);
  } else if (snap.listingCount > 0) {
    lines.push(fillTape(copy.listedCount, { n: snap.listingCount }));
  }
  if (snap.unclaimedCount > 0) {
    lines.push(snap.unclaimedAsksAllTime > 0 ? copy.unclaimedBeingAsked : copy.unclaimedCanAsk);
  }
  if (snap.listedThisWeek > 0) {
    lines.push(countLine(snap.listedThisWeek, copy.newListingOne, copy.newListingMany));
  }
  if (snap.verifiedCount > 0) {
    lines.push(countLine(snap.verifiedCount, copy.verifiedOne, copy.verifiedMany));
  }
  if (snap.trialCount > 0) {
    lines.push(countLine(snap.trialCount, copy.trialOne, copy.trialMany));
  }
  if (snap.reviewCount > 0) {
    lines.push(countLine(snap.reviewCount, copy.reviewOne, copy.reviewMany));
  }
  for (const trade of snap.trades) {
    const line = tradeClaimHeadline(trade, language);
    if (line) lines.push(line);
  }
  if (snap.professionCount > 0) {
    lines.push(fillTape(copy.helpTypes, { n: snap.professionCount }));
  }
  if (snap.areaCount > 0) {
    lines.push(fillTape(copy.areas, { n: snap.areaCount }));
  }
  return lines;
}

type CachedSnapshot = { at: number; value: SiteActivitySnapshot };
const snapshotCache: { current: CachedSnapshot | null } = { current: null };
const SNAPSHOT_TTL_MS = 30_000;

export async function siteActivitySnapshot(): Promise<SiteActivitySnapshot> {
  if (snapshotCache.current && Date.now() - snapshotCache.current.at < SNAPSHOT_TTL_MS) {
    return snapshotCache.current.value;
  }
  const value = await loadSiteActivitySnapshot();
  snapshotCache.current = { at: Date.now(), value };
  return value;
}

async function loadSiteActivitySnapshot(): Promise<SiteActivitySnapshot> {
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
  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const listed = {
    deletedAt: null,
    claimStatus: { not: CLAIM_STATUS.SUSPENDED },
    ...(countryId ? { countryId } : {}),
  };
  const inCountry = countryId ? { business: { countryId } } : {};

  const countryFilter = countryId ?? null;
  const [listingStats, tradeStats, slugs] = await Promise.all([
    prisma.$queryRaw<
      Array<{
        listings: number;
        unclaimed: number;
        claimed: number;
        verified: number;
        listed_week: number;
        trial: number;
        call_now: number;
      }>
    >`
      SELECT
        COUNT(*)::int AS listings,
        COUNT(*) FILTER (WHERE "claimStatus" = ${CLAIM_STATUS.UNCLAIMED})::int AS unclaimed,
        COUNT(*) FILTER (WHERE "claimStatus" IN (${CLAIM_STATUS.CLAIMED}, ${CLAIM_STATUS.VERIFIED}))::int AS claimed,
        COUNT(*) FILTER (WHERE "claimStatus" = ${CLAIM_STATUS.VERIFIED})::int AS verified,
        COUNT(*) FILTER (WHERE "createdAt" >= ${weekStart})::int AS listed_week,
        COUNT(*) FILTER (WHERE "paymentState" IN (${PAYMENT_STATES.FREE_TRIAL_ACTIVE}, ${PAYMENT_STATES.SUBSCRIPTION_TRIALING}))::int AS trial,
        COUNT(*) FILTER (
          WHERE "claimStatus" IN (${CLAIM_STATUS.CLAIMED}, ${CLAIM_STATUS.VERIFIED})
            AND "phoneReal" IS NOT NULL
            AND "paymentState" IN (${PAYMENT_STATES.SUBSCRIPTION_ACTIVE}, ${PAYMENT_STATES.SUBSCRIPTION_TRIALING})
        )::int AS call_now
      FROM "Business"
      WHERE "deletedAt" IS NULL
        AND "claimStatus" <> ${CLAIM_STATUS.SUSPENDED}
        AND (${countryFilter}::text IS NULL OR "countryId" = ${countryFilter})
        AND (
          "claimStatus" <> ${CLAIM_STATUS.UNCLAIMED}
          OR NULLIF(BTRIM(COALESCE("contactEmail", '')), '') IS NOT NULL
          OR NULLIF(BTRIM(COALESCE("phoneReal", '')), '') IS NOT NULL
          OR NULLIF(BTRIM(COALESCE("phoneDisplay", '')), '') IS NOT NULL
        )
    `,
    prisma.$queryRaw<Array<{ professionId: string; unclaimed: number; claimed: number }>>`
      SELECT
        bp."professionId",
        COUNT(*) FILTER (WHERE b."claimStatus" = ${CLAIM_STATUS.UNCLAIMED})::int AS unclaimed,
        COUNT(*) FILTER (WHERE b."claimStatus" IN (${CLAIM_STATUS.CLAIMED}, ${CLAIM_STATUS.VERIFIED}))::int AS claimed
      FROM "BusinessProfession" bp
      JOIN "Business" b ON b.id = bp."businessId"
      WHERE b."deletedAt" IS NULL
        AND b."claimStatus" <> ${CLAIM_STATUS.SUSPENDED}
        AND (${countryFilter}::text IS NULL OR b."countryId" = ${countryFilter})
        AND (
          b."claimStatus" <> ${CLAIM_STATUS.UNCLAIMED}
          OR NULLIF(BTRIM(COALESCE(b."contactEmail", '')), '') IS NOT NULL
          OR NULLIF(BTRIM(COALESCE(b."phoneReal", '')), '') IS NOT NULL
          OR NULLIF(BTRIM(COALESCE(b."phoneDisplay", '')), '') IS NOT NULL
        )
      GROUP BY bp."professionId"
    `,
    prisma.professionSlug.findMany({
      where: { ...(countryId ? { countryId } : {}), profession: { active: true } },
      select: { professionId: true, name: true, pluralName: true },
    }),
  ]);

  const [callsLastHour, callsToday, callsAllTime, lastCall] = await Promise.all([
    prisma.call.count({ where: { startedAt: { gte: hourStart }, ...inCountry } }),
    prisma.call.count({ where: { startedAt: { gte: dayStart }, ...inCountry } }),
    prisma.call.count({ where: inCountry }),
    prisma.call.findFirst({
      where: inCountry,
      orderBy: { startedAt: "desc" },
      select: { startedAt: true },
    }),
  ]);

  const [asksToday, unclaimedAsksToday, unclaimedAsksAllTime, availableNow, areaCount, reviewCount] = await Promise.all([
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
    prisma.review.count({
      where: { published: true, ...(countryId ? { business: { countryId } } : {}) },
    }),
  ]);

  const stats = listingStats[0] ?? {
    listings: 0,
    unclaimed: 0,
    claimed: 0,
    verified: 0,
    listed_week: 0,
    trial: 0,
    call_now: 0,
  };
  const names = new Map(slugs.map((row) => [row.professionId, { name: row.name, plural: row.pluralName }]));
  const trades = tradeStats
    .map((row) => {
      const labels = names.get(row.professionId);
      if (!labels) return null;
      return { ...labels, claimed: row.claimed, unclaimed: row.unclaimed };
    })
    .filter((row): row is TradeClaimCounts => Boolean(row))
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
    listingCount: stats.listings,
    claimedCount: stats.claimed,
    unclaimedCount: stats.unclaimed,
    callNowOnCount: stats.call_now,
    verifiedCount: stats.verified,
    trialCount: stats.trial,
    listedThisWeek: stats.listed_week,
    reviewCount,
    areaCount,
    professionCount: slugs.length,
    trades,
  };
}
