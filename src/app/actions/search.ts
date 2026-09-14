"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { resolvePlace, reverseGeocode } from "@/lib/locations/geocode";

export async function goToMarketplace(formData: FormData) {
  const country = String(formData.get("country") ?? "gb").toLowerCase();
  const professionQuery = slugify(String(formData.get("profession") ?? "plumbers"));
  const locationQuery = String(formData.get("location") ?? "").trim();
  const emergency = formData.get("emergency") === "1";
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  const countryRow = await prisma.country.findUnique({ where: { iso2: country } });
  if (!countryRow) redirect("/");

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

  const place = await resolvePlace({
    countryId: countryRow.id,
    countryIso2: countryRow.iso2,
    query: locationQuery,
    lat: Number.isFinite(lat) && lat !== 0 ? lat : undefined,
    lng: Number.isFinite(lng) && lng !== 0 ? lng : undefined,
  });

  if (profession && place) {
    const slug = emergency && profession.emergencySlug ? profession.emergencySlug : profession.slug;
    const params = new URLSearchParams();
    if (place.source !== "directory") {
      params.set("near", place.label);
      params.set("lat", String(place.lat));
      params.set("lng", String(place.lng));
    }
    const query = params.toString();
    redirect(`/${country}/${slug}/${place.locationSlug}${query ? `?${query}` : ""}`);
  }

  const params = new URLSearchParams();
  if (professionQuery) params.set("profession", professionQuery);
  if (locationQuery) params.set("location", locationQuery);
  redirect(`/${country}/search?${params.toString()}`);
}

export async function labelForCoordinates(country: string, lat: number, lng: number) {
  const label = await reverseGeocode({ lat, lng }, country.toLowerCase());
  return label ?? "Current location";
}
