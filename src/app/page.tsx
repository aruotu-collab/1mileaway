import Link from "next/link";
import { prisma } from "@/lib/db";
import { SearchBox } from "@/components/search-box";

export default async function HomePage() {
  const professions = await prisma.professionSlug.findMany({
    where: { country: { iso2: "gb" } },
    include: { profession: true },
    take: 8,
  });
  const locations = await prisma.location.findMany({
    where: { country: { iso2: "gb" }, type: "district" },
    take: 6,
  });

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-moss-deep">Local help, actually available</p>
      <h1 className="serif mt-3 max-w-3xl text-5xl leading-[1.05] sm:text-6xl">
        Find a professional nearby who can actually help.
      </h1>
      <p className="mt-5 max-w-2xl text-lg text-ink-soft">
        Not a stale directory. 1mileaway shows people who serve your area and have recently said they are free to take work.
      </p>
      <div className="mt-8">
        <SearchBox defaultLocation="" showUrgencyTabs />
      </div>

      <section className="mt-14">
        <h2 className="serif text-3xl">Popular professions</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {professions.map((p) => (
            <Link
              key={p.id}
              href={`/gb/${p.slug}/catford`}
              className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm"
            >
              {p.pluralName}
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="serif text-3xl">Popular locations</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {locations.map((loc) => (
            <Link
              key={loc.id}
              href={`/gb/plumbers/${loc.slug}`}
              className="rounded-full border border-line bg-paper-strong px-4 py-2 text-sm"
            >
              {loc.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="card mt-14 p-6 sm:p-8">
        <h2 className="serif text-3xl">Are you a professional?</h2>
        <p className="mt-3 max-w-xl text-ink-soft">
          Start with free qualified leads. No prepaid wallet. After the trial you get one trust lead, then settle that job to continue.
        </p>
        <Link href="/for-professionals" className="btn btn-primary mt-5">
          Join as a professional
        </Link>
      </section>
    </main>
  );
}
