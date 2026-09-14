import { prisma } from "@/lib/db";
import { haversineMiles } from "@/lib/utils";

export type GeoPoint = { lat: number; lng: number };

export type ResolvedPlace = {
  label: string;
  lat: number;
  lng: number;
  locationSlug: string;
  locationName: string;
  source: "directory" | "postcode" | "address" | "coordinates";
};

const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
const UK_OUTCODE = /^[A-Z]{1,2}\d[A-Z\d]?$/i;

export function isUkPostcode(value: string) {
  const compact = value.trim().replace(/\s+/g, "");
  return UK_POSTCODE.test(compact) || UK_OUTCODE.test(compact);
}

export async function nearestLocation(countryId: string, point: GeoPoint) {
  const rows = await prisma.location.findMany({
    where: { countryId, active: true, lat: { not: null }, lng: { not: null } },
  });
  const ranked = rows
    .filter((row) => row.lat != null && row.lng != null)
    .map((row) => ({
      row,
      miles: haversineMiles(point, { lat: row.lat!, lng: row.lng! }),
    }))
    .sort((a, b) => a.miles - b.miles);
  return ranked[0]?.row ?? null;
}

async function lookupDirectory(countryId: string, query: string) {
  const trimmed = query.trim();
  if (!trimmed) return null;
  return prisma.location.findFirst({
    where: {
      countryId,
      active: true,
      OR: [
        { slug: trimmed.toLowerCase().replace(/\s+/g, "-") },
        { name: { equals: trimmed } },
        { name: { contains: trimmed } },
        { aliases: { some: { alias: { contains: trimmed } } } },
      ],
    },
  });
}

async function lookupUkPostcode(query: string): Promise<GeoPoint & { label: string } | null> {
  const compact = query.trim().replace(/\s+/g, "").toUpperCase();
  const path = UK_POSTCODE.test(compact) ? `postcodes/${encodeURIComponent(compact)}` : `outcodes/${encodeURIComponent(compact)}`;
  try {
    const res = await fetch(`https://api.postcodes.io/${path}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      result?: { latitude?: number; longitude?: number; postcode?: string; outcode?: string };
    };
    if (body.result?.latitude == null || body.result.longitude == null) return null;
    return {
      lat: body.result.latitude,
      lng: body.result.longitude,
      label: body.result.postcode ?? body.result.outcode ?? query.trim(),
    };
  } catch {
    return null;
  }
}

async function lookupAddress(query: string, countryIso2: string): Promise<GeoPoint & { label: string } | null> {
  const params = new URLSearchParams({
    q: query,
    format: "json",
    limit: "1",
    countrycodes: countryIso2,
    addressdetails: "1",
  });
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${params}`, {
      headers: { "User-Agent": "1mileaway.com/local-search" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const first = body[0];
    if (!first?.lat || !first.lon) return null;
    return { lat: Number(first.lat), lng: Number(first.lon), label: first.display_name ?? query };
  } catch {
    return null;
  }
}

export async function reverseGeocode(point: GeoPoint, countryIso2: string) {
  if (countryIso2 === "gb") {
    try {
      const res = await fetch(
        `https://api.postcodes.io/postcodes?lon=${point.lng}&lat=${point.lat}`,
        { cache: "no-store" },
      );
      if (res.ok) {
        const body = (await res.json()) as { result?: Array<{ postcode?: string }> };
        if (body.result?.[0]?.postcode) return body.result[0].postcode;
      }
    } catch {
      // fall through
    }
  }
  try {
    const params = new URLSearchParams({
      lat: String(point.lat),
      lon: String(point.lng),
      format: "json",
    });
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: { "User-Agent": "1mileaway.com/local-search" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { display_name?: string };
    return body.display_name ?? null;
  } catch {
    return null;
  }
}

export async function resolvePlace(input: {
  countryId: string;
  countryIso2: string;
  query?: string;
  lat?: number;
  lng?: number;
}): Promise<ResolvedPlace | null> {
  if (input.lat != null && input.lng != null && Number.isFinite(input.lat) && Number.isFinite(input.lng)) {
    const nearest = await nearestLocation(input.countryId, { lat: input.lat, lng: input.lng });
    if (!nearest) return null;
    return {
      label: input.query?.trim() || nearest.name,
      lat: input.lat,
      lng: input.lng,
      locationSlug: nearest.slug,
      locationName: nearest.name,
      source: "coordinates",
    };
  }

  const query = input.query?.trim() ?? "";
  if (!query) return null;

  const directory = await lookupDirectory(input.countryId, query);
  if (directory?.lat != null && directory.lng != null) {
    return {
      label: directory.name,
      lat: directory.lat,
      lng: directory.lng,
      locationSlug: directory.slug,
      locationName: directory.name,
      source: "directory",
    };
  }

  if (input.countryIso2 === "gb" && isUkPostcode(query)) {
    const postcode = await lookupUkPostcode(query);
    if (postcode) {
      const nearest = await nearestLocation(input.countryId, postcode);
      if (nearest) {
        return {
          label: postcode.label,
          lat: postcode.lat,
          lng: postcode.lng,
          locationSlug: nearest.slug,
          locationName: nearest.name,
          source: "postcode",
        };
      }
    }
  }

  const address = await lookupAddress(query, input.countryIso2);
  if (address) {
    const nearest = await nearestLocation(input.countryId, address);
    if (nearest) {
      return {
        label: address.label,
        lat: address.lat,
        lng: address.lng,
        locationSlug: nearest.slug,
        locationName: nearest.name,
        source: "address",
      };
    }
  }

  return directory
    ? {
        label: directory.name,
        lat: directory.lat ?? 0,
        lng: directory.lng ?? 0,
        locationSlug: directory.slug,
        locationName: directory.name,
        source: "directory",
      }
    : null;
}
