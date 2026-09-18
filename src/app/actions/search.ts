"use server";

import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { resolvePlace, reverseGeocode } from "@/lib/locations/geocode";
import { marketplaceHref } from "@/lib/search/marketplace";

export async function goToMarketplace(formData: FormData): Promise<{ href: string } | { error: string }> {
  const country = String(formData.get("country") ?? "gb").toLowerCase();
  const professionQuery = slugify(String(formData.get("profession") ?? "plumbers"));
  const locationQuery = String(formData.get("location") ?? "").trim();
  const emergency = formData.get("emergency") === "1";
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!locationQuery && !(Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0)) {
    return { error: "Choose where you need help — pick an area, use your location, or type a postcode." };
  }

  const countryRow = await prisma.country.findUnique({ where: { iso2: country } });
  if (!countryRow) return { error: "That country is not on 1mileaway yet." };

  const profession = await prisma.professionSlug.findFirst({
    where: {
      countryId: countryRow.id,
      OR: [
        { slug: { contains: professionQuery } },
        { emergencySlug: { contains: professionQuery } },
        { name: { contains: professionQuery.replace(/-/g, " ") } },
        { pluralName: { contains: professionQuery.replace(/-/g, " ") } },
      ],
    },
  });
  if (!profession) return { error: "Choose what you need from the list." };

  const place = await resolvePlace({
    countryId: countryRow.id,
    countryIso2: countryRow.iso2,
    query: locationQuery,
    lat: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
  });
  if (!place) {
    return { error: "We could not recognise that place. Pick an area from the list, or type a postcode." };
  }

  return {
    href: marketplaceHref({
      country,
      professionSlug: profession.slug,
      emergencySlug: profession.emergencySlug,
      emergency,
      locationSlug: place.locationSlug,
      near: place.source === "directory" ? null : { label: place.label, lat: place.lat, lng: place.lng },
    }),
  };
}

export async function labelForCoordinates(country: string, lat: number, lng: number) {
  const label = await reverseGeocode({ lat, lng }, country.toLowerCase());
  return label ?? "Current location";
}
