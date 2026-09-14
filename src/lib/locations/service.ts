import { prisma } from "@/lib/db";
import { haversineMiles } from "@/lib/utils";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { rankListings, type Rankable } from "@/lib/ranking/engine";

export async function getActiveCountry(iso2: string) {
  return prisma.country.findUnique({ where: { iso2: iso2.toLowerCase() } });
}

export async function getProfessionBySlug(countryId: string, slug: string) {
  return prisma.professionSlug.findFirst({
    where: {
      countryId,
      OR: [{ slug }, { emergencySlug: slug }],
    },
    include: { profession: { include: { category: true } } },
  });
}

export async function getLocationBySlug(countryId: string, slug: string) {
  return prisma.location.findFirst({
    where: { countryId, slug, active: true },
    include: { country: true, parent: true, aliases: true },
  });
}

export async function nearbyLocations(locationId: string, limit = 6) {
  const origin = await prisma.location.findUnique({ where: { id: locationId } });
  if (!origin || origin.lat == null || origin.lng == null) {
    return prisma.location.findMany({
      where: { parentId: origin?.parentId ?? undefined, id: { not: locationId }, active: true },
      take: limit,
    });
  }
  const siblings = await prisma.location.findMany({
    where: { countryId: origin.countryId, type: origin.type, active: true, id: { not: origin.id } },
  });
  return siblings
    .filter((loc) => loc.lat != null && loc.lng != null)
    .map((loc) => ({
      ...loc,
      distance: haversineMiles(
        { lat: origin.lat!, lng: origin.lng! },
        { lat: loc.lat!, lng: loc.lng! },
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
}

export type ListingFilters = {
  availableNow?: boolean;
  availableToday?: boolean;
  verified?: boolean;
  emergency?: boolean;
  sort?: "recommended" | "nearest" | "available" | "rated";
};

export async function listingsFor(input: {
  countryId: string;
  professionId: string;
  location: { id: string; lat: number | null; lng: number | null };
  origin?: { lat: number; lng: number } | null;
  radiusMiles?: number;
  filters?: ListingFilters;
}) {
  const origin =
    input.origin ??
    (input.location.lat != null && input.location.lng != null
      ? { lat: input.location.lat, lng: input.location.lng }
      : null);
  const radiusMiles = input.radiusMiles ?? 8;

  const nearbyIds = origin
    ? (
        await prisma.location.findMany({
          where: { countryId: input.countryId, active: true, lat: { not: null }, lng: { not: null } },
        })
      )
        .filter((row) => row.lat != null && row.lng != null)
        .filter((row) => haversineMiles(origin, { lat: row.lat!, lng: row.lng! }) <= radiusMiles)
        .map((row) => row.id)
    : [];

  const locationIds = Array.from(new Set([input.location.id, ...nearbyIds]));

  const rows = await prisma.business.findMany({
    where: {
      countryId: input.countryId,
      deletedAt: null,
      claimStatus: { not: "SUSPENDED" },
      professions: { some: { professionId: input.professionId } },
      locations: { some: { locationId: { in: locationIds } } },
    },
    include: {
      availability: true,
      locations: { include: { location: true } },
      professions: { include: { profession: true } },
      verifications: true,
    },
  });

  const preciseOrigin = Boolean(input.origin);
  const mapped = rows.map((biz) => {
    const served = biz.locations.find((l) => l.locationId === input.location.id)?.location;
    const home = biz.locations[0]?.location;
    const point = home?.lat != null && home.lng != null ? { lat: home.lat, lng: home.lng } : served;
    let distanceMiles = 0.8;
    if (origin && point?.lat != null && point.lng != null) {
      distanceMiles = haversineMiles(origin, { lat: point.lat, lng: point.lng });
    }
    if (!preciseOrigin && distanceMiles < 0.15) {
      const jitter = (biz.slug.length % 9) / 10 + 0.2;
      distanceMiles = jitter;
    }
    const status = isAvailabilityLive(biz.availability?.status ?? "UNKNOWN", biz.availability?.expiresAt);
    const rankable: Rankable & typeof biz = {
      ...biz,
      distanceMiles,
      availabilityStatus: status,
      availabilityExpiresAt: biz.availability?.expiresAt ?? null,
      availabilityConfirmedAt: biz.availability?.confirmedAt ?? null,
      about: biz.about,
      photoUrl: biz.photoUrl,
    };
    return rankable;
  });

  let filtered = mapped;
  if (input.filters?.availableNow) {
    filtered = filtered.filter((b) => b.availabilityStatus === "AVAILABLE_NOW");
  }
  if (input.filters?.availableToday) {
    filtered = filtered.filter((b) =>
      ["AVAILABLE_NOW", "AVAILABLE_TODAY"].includes(b.availabilityStatus),
    );
  }
  if (input.filters?.verified) {
    filtered = filtered.filter((b) => b.claimStatus === "VERIFIED");
  }

  const ranked = rankListings(filtered);
  if (input.filters?.sort === "nearest") {
    return [...ranked].sort((a, b) => a.distanceMiles - b.distanceMiles);
  }
  if (input.filters?.sort === "available") {
    return [...ranked].sort((a, b) => b.explanation.availability - a.explanation.availability);
  }
  if (input.filters?.sort === "rated") {
    return [...ranked].sort((a, b) => b.ratingAvg - a.ratingAvg);
  }
  return ranked;
}
