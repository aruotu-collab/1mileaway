import { prisma } from "@/lib/db";
import { SearchBox } from "@/components/search-box";
import { displayCategoryName } from "@/lib/professions";

export async function MarketplaceSearch({
  country = "gb",
  defaultProfession = "plumbers",
  defaultLocation = "",
  emergency = false,
  showUrgencyTabs = true,
  regularHref,
  emergencyHref,
}: {
  country?: string;
  defaultProfession?: string;
  defaultLocation?: string;
  emergency?: boolean;
  showUrgencyTabs?: boolean;
  regularHref?: string;
  emergencyHref?: string;
}) {
  const [rows, locationRows] = await Promise.all([
    prisma.professionSlug.findMany({
      where: { country: { iso2: country }, profession: { active: true } },
      orderBy: { pluralName: "asc" },
      select: {
        slug: true,
        pluralName: true,
        profession: { select: { category: { select: { slug: true, name: true, sortOrder: true } } } },
      },
    }),
    prisma.location.findMany({
      where: { country: { iso2: country }, active: true, type: { in: ["district", "city"] } },
      orderBy: [{ type: "desc" }, { name: "asc" }],
      select: { slug: true, name: true, type: true },
    }),
  ]);

  return (
    <SearchBox
      country={country}
      defaultProfession={defaultProfession}
      defaultLocation={defaultLocation}
      emergency={emergency}
      showUrgencyTabs={showUrgencyTabs}
      regularHref={regularHref}
      emergencyHref={emergencyHref}
      professions={rows.map((row) => ({
        slug: row.slug,
        label: row.pluralName,
        category: displayCategoryName(row.profession.category.slug, row.profession.category.name),
        categoryOrder: row.profession.category.sortOrder,
      }))}
      locations={locationRows.map((row) => ({ slug: row.slug, name: row.name }))}
    />
  );
}
