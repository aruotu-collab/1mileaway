import Link from "next/link";
import { prisma } from "@/lib/db";
import { SearchBox } from "@/components/search-box";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams: Promise<{ profession?: string; location?: string }>;
}) {
  const { country } = await params;
  const query = await searchParams;
  const countryRow = await prisma.country.findUnique({ where: { iso2: country } });
  const professions = await prisma.professionSlug.findMany({
    where: {
      country: { iso2: country },
      OR: query.profession
        ? [
            { slug: { contains: query.profession } },
            { pluralName: { contains: query.profession.replace(/-/g, " ") } },
          ]
        : undefined,
    },
  });
  const locations = await prisma.location.findMany({
    where: {
      country: { iso2: country },
      type: { in: ["district", "city"] },
      OR: query.location
        ? [{ slug: { contains: query.location } }, { name: { contains: query.location } }]
        : undefined,
    },
    take: 20,
  });

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="serif text-4xl">Search {countryRow?.name ?? ""}</h1>
      <div className="mt-6">
        <SearchBox
          country={country}
          defaultProfession={query.profession ?? "plumbers"}
          defaultLocation={query.location ?? ""}
        />
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <section>
          <h2 className="serif text-2xl">Professions</h2>
          <ul className="mt-3 grid gap-2">
            {professions.map((p) => (
              <li key={p.id}>
                <Link href={`/${country}/${p.slug}/${locations[0]?.slug ?? "catford"}`}>{p.pluralName}</Link>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="serif text-2xl">Locations</h2>
          <ul className="mt-3 grid gap-2">
            {locations.map((loc) => (
              <li key={loc.id}>
                <Link href={`/${country}/${professions[0]?.slug ?? "plumbers"}/${loc.slug}`}>{loc.name}</Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
