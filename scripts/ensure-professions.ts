import { prisma } from "../src/lib/db";
import { ensureProfessionCatalog } from "../src/lib/profession-catalog";

async function main() {
  await ensureProfessionCatalog(prisma);
  const mobile = await prisma.professionSlug.findMany({
    where: { country: { iso2: "gb" }, profession: { category: { slug: "mobile" } } },
    orderBy: { pluralName: "asc" },
    select: { slug: true, pluralName: true },
  });
  console.log(mobile.map((row) => `${row.slug} (${row.pluralName})`).join("\n"));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
