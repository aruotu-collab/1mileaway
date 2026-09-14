import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { listingsFor } from "@/lib/locations/service";
import { isIndexable } from "@/lib/seo/indexability";
import { APP_URL } from "@/lib/constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const countries = await prisma.country.findMany({ where: { active: true } });
  const entries: MetadataRoute.Sitemap = [{ url: APP_URL, changeFrequency: "daily", priority: 1 }];

  for (const country of countries) {
    const slugs = await prisma.professionSlug.findMany({ where: { countryId: country.id } });
    const locations = await prisma.location.findMany({
      where: { countryId: country.id, type: "district", active: true },
    });
    for (const slug of slugs) {
      for (const location of locations) {
        const listings = await listingsFor({
          countryId: country.id,
          professionId: slug.professionId,
          location,
        });
        if (
          isIndexable({
            listingCount: listings.length,
            uniqueBusinesses: new Set(listings.map((l) => l.id)).size,
            hasLocalCopy: true,
          })
        ) {
          entries.push({
            url: `${APP_URL}/${country.iso2}/${slug.slug}/${location.slug}`,
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      }
    }
  }

  return entries;
}
