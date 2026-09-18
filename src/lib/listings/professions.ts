import { prisma } from "@/lib/db";
import { displayCategoryName, uniqueProfessionIds, type ProfessionPick } from "@/lib/professions";

export async function listProfessionPicks(countryIso = "gb"): Promise<ProfessionPick[]> {
  const rows = await prisma.profession.findMany({
    where: { active: true },
    include: {
      category: true,
      slugs: { where: { country: { iso2: countryIso } }, take: 1 },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { internalId: "asc" }],
  });
  return rows.map((row) => ({
    id: row.id,
    slug: row.slugs[0]?.slug ?? row.internalId,
    label: row.slugs[0]?.name ?? row.internalId.replace(/_/g, " "),
    category: displayCategoryName(row.category.slug, row.category.name),
    categoryOrder: row.category.sortOrder,
  }));
}

export async function replaceBusinessProfessions(businessId: string, professionIds: string[]) {
  const requested = uniqueProfessionIds(professionIds);
  if (requested.length === 0) return false;
  const active = await prisma.profession.findMany({
    where: { id: { in: requested }, active: true },
    select: { id: true },
  });
  const allowed = new Set(active.map((row) => row.id));
  const ids = requested.filter((id) => allowed.has(id));
  if (ids.length === 0) return false;
  await prisma.$transaction([
    prisma.businessProfession.deleteMany({
      where: { businessId, professionId: { notIn: ids } },
    }),
    ...ids.map((professionId) =>
      prisma.businessProfession.upsert({
        where: { businessId_professionId: { businessId, professionId } },
        create: { businessId, professionId },
        update: {},
      }),
    ),
  ]);
  return true;
}
