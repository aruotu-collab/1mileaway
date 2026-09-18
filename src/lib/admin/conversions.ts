import { CLAIM_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { startOfLocalDay } from "@/lib/utils";

export const CLAIM_COMPLETED = "claim.completed";
export const ADMIN_TZ = "Europe/London";

export function localDateKey(date: Date, timeZone = ADMIN_TZ) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

export function lastLocalDayKeys(days: number, now = new Date(), timeZone = ADMIN_TZ) {
  return Array.from({ length: days }, (_, index) =>
    localDateKey(new Date(now.getTime() - index * 24 * 60 * 60 * 1000), timeZone),
  );
}

export function labelLocalDay(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function countByDay(dates: Date[], keys: string[], timeZone = ADMIN_TZ) {
  const counts = new Map(keys.map((key) => [key, 0]));
  for (const date of dates) {
    const key = localDateKey(date, timeZone);
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return keys.map((key) => ({ key, label: labelLocalDay(key), count: counts.get(key) ?? 0 }));
}

export type ConversionRow = {
  at: Date;
  dayKey: string;
  businessId: string;
  name: string;
  slug: string;
  country: string;
  email: string | null;
  actorEmail: string | null;
  trade: string;
  area: string;
  askedBefore: number;
};

export async function claimConversions(days = 14) {
  const now = new Date();
  const dayStart = startOfLocalDay(ADMIN_TZ, now);
  const keys = lastLocalDayKeys(days, now);
  const weekKeys = new Set(keys.slice(0, 7));

  const logs = await prisma.auditLog.findMany({
    where: { action: CLAIM_COMPLETED },
    include: { actor: true },
    orderBy: { createdAt: "desc" },
  });
  const ids = [...new Set(logs.map((log) => log.entityId).filter((id): id is string => Boolean(id)))];

  const [businesses, askCounts, unclaimedCount] = await Promise.all([
    ids.length
      ? prisma.business.findMany({
          where: { id: { in: ids } },
          include: {
            country: true,
            professions: { include: { profession: { include: { slugs: { take: 1 } } } } },
            locations: { include: { location: true } },
          },
        })
      : Promise.resolve([]),
    ids.length
      ? prisma.lead.groupBy({
          by: ["businessId"],
          where: { callId: null, businessId: { in: ids } },
          _count: { _all: true },
        })
      : Promise.resolve([]),
    prisma.business.count({
      where: { deletedAt: null, claimStatus: CLAIM_STATUS.UNCLAIMED },
    }),
  ]);

  const byId = new Map(businesses.map((business) => [business.id, business]));
  const asksByBusiness = new Map(askCounts.map((row) => [row.businessId, row._count._all]));

  const conversions: ConversionRow[] = [];
  for (const log of logs) {
    if (!log.entityId) continue;
    const business = byId.get(log.entityId);
    if (!business) continue;
    conversions.push({
      at: log.createdAt,
      dayKey: localDateKey(log.createdAt),
      businessId: business.id,
      name: business.name,
      slug: business.slug,
      country: business.country.iso2,
      email: business.contactEmail,
      actorEmail: log.actor?.email ?? null,
      trade: business.professions[0]?.profession.slugs[0]?.name ?? business.professions[0]?.profession.internalId ?? "trade",
      area: business.locations[0]?.location.name ?? "no area",
      askedBefore: asksByBusiness.get(business.id) ?? 0,
    });
  }

  const series = countByDay(
    conversions.map((row) => row.at),
    keys,
  );
  const today = conversions.filter((row) => row.at >= dayStart);
  const week = conversions.filter((row) => weekKeys.has(row.dayKey));

  return {
    conversions,
    today,
    series,
    unclaimedCount,
    todayCount: today.length,
    weekCount: week.length,
    allCount: conversions.length,
    askedThenClaimed: conversions.filter((row) => row.askedBefore > 0).length,
  };
}
