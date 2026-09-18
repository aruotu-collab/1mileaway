import type { MetadataRoute } from "next";
import { prisma } from "@/lib/db";
import { isIndexable } from "@/lib/seo/indexability";
import { APP_URL } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [countries, overrides, businesses] = await Promise.all([
    prisma.country.findMany({ where: { active: true }, select: { id: true, iso2: true } }),
    prisma.seoPageOverride.findMany({ select: { path: true, noindex: true } }),
    prisma.business.findMany({
      where: { deletedAt: null, claimStatus: { not: "SUSPENDED" } },
      select: {
        id: true,
        countryId: true,
        professions: { select: { professionId: true } },
        locations: { select: { locationId: true } },
      },
    }),
  ]);
  const overrideByPath = new Map(overrides.map((row) => [row.path, row.noindex]));
  const entries: MetadataRoute.Sitemap = [
    { url: APP_URL, changeFrequency: "daily", priority: 1 },
    { url: `${APP_URL}/for-professionals`, changeFrequency: "weekly", priority: 0.5 },
  ];

  for (const country of countries) {
    const [slugs, locations] = await Promise.all([
      prisma.professionSlug.findMany({
        where: { countryId: country.id },
        select: { slug: true, professionId: true },
      }),
      prisma.location.findMany({
        where: { countryId: country.id, type: "district", active: true },
        select: { id: true, slug: true },
      }),
    ]);
    const local = businesses.filter((row) => row.countryId === country.id);
    for (const slug of slugs) {
      for (const location of locations) {
        const path = `/${country.iso2}/${slug.slug}/${location.slug}`;
        const matches = local.filter(
          (row) =>
            row.professions.some((item) => item.professionId === slug.professionId) &&
            row.locations.some((item) => item.locationId === location.id),
        );
        if (
          isIndexable({
            listingCount: matches.length,
            uniqueBusinesses: matches.length,
            hasLocalCopy: true,
            overrideNoindex: overrideByPath.get(path),
          })
        ) {
          entries.push({
            url: `${APP_URL}${path}`,
            changeFrequency: "daily",
            priority: 0.8,
          });
        }
      }
    }
  }

  return entries;
}
