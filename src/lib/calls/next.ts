import { prisma } from "@/lib/db";
import { listingsFor } from "@/lib/locations/service";
import { listingCallOptions } from "@/lib/phone";

export function pickNextCallable<T extends { id: string; phone?: string | null }>(
  listings: T[],
  excludeBusinessIds: string[],
) {
  const skipped = new Set(excludeBusinessIds);
  return listings.find((listing) => listing.phone && !skipped.has(listing.id)) ?? null;
}

export function skippedBusinessIdsFromPayload(payload?: string | null) {
  if (!payload) return [];
  try {
    const parsed = JSON.parse(payload) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0);
  } catch {
    return payload.split(",").map((id) => id.trim()).filter(Boolean);
  }
}

export async function nextCallableListing(input: {
  countryId: string;
  professionId: string;
  locationId: string;
  excludeBusinessIds: string[];
}) {
  const location = await prisma.location.findUnique({ where: { id: input.locationId } });
  if (!location) return null;
  const listings = await listingsFor({
    countryId: input.countryId,
    professionId: input.professionId,
    location,
    filters: { sort: "nearest" },
  });
  const withPhones = listings.map((listing) => ({
    ...listing,
    ...listingCallOptions(listing),
  }));
  return pickNextCallable(withPhones, input.excludeBusinessIds);
}
