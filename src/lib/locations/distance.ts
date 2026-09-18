import { haversineMiles } from "@/lib/utils";

export type GeoPoint = { lat: number; lng: number };

export function isGeoPoint(value: { lat?: number | null; lng?: number | null } | null | undefined): value is GeoPoint {
  return value?.lat != null && value.lng != null && Number.isFinite(value.lat) && Number.isFinite(value.lng);
}

export function milesBetween(from: GeoPoint | null | undefined, to: GeoPoint | null | undefined) {
  if (!isGeoPoint(from) || !isGeoPoint(to)) return null;
  return haversineMiles(from, to);
}

export function formatDistanceMiles(miles: number | null, fromVisitor = false) {
  if (miles == null) return "Distance not known yet";
  if (miles < 0.05) return fromVisitor ? "Here" : "In this area";
  const value = miles < 10 ? miles.toFixed(1) : String(Math.round(miles));
  return `${value} miles ${fromVisitor ? "from you" : "from this area"}`;
}

export function listingPoint(input: {
  lat?: number | null;
  lng?: number | null;
  locations?: Array<{ location?: { lat?: number | null; lng?: number | null } | null }>;
}): GeoPoint | null {
  if (isGeoPoint(input)) return { lat: input.lat, lng: input.lng };
  for (const row of input.locations ?? []) {
    if (isGeoPoint(row.location)) return { lat: row.location.lat, lng: row.location.lng };
  }
  return null;
}
