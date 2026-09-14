import { prisma } from "@/lib/db";
import { toggleCountry } from "@/app/actions/admin";

export default async function AdminCountriesPage() {
  const countries = await prisma.country.findMany({ orderBy: [{ tier: "asc" }, { name: "asc" }] });
  return (
    <main>
      <h1 className="serif text-4xl">Countries</h1>
      <ul className="mt-6 grid gap-2">
        {countries.map((country) => (
          <li key={country.id} className="card flex items-center justify-between gap-3 p-4">
            <div>
              <p className="font-semibold">
                {country.name} ({country.iso2.toUpperCase()})
              </p>
              <p className="text-sm text-ink-soft">
                {country.currency} · tier {country.tier} · {country.active ? "active" : "infrastructure only"}
              </p>
            </div>
            <form action={toggleCountry}>
              <input type="hidden" name="id" value={country.id} />
              <button className="btn btn-ghost" type="submit">
                {country.active ? "Deactivate" : "Activate"}
              </button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
