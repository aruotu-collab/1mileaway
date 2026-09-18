import { prisma } from "@/lib/db";
import { toggleCountry } from "@/app/actions/admin";
import { LAUNCH_COUNTRIES } from "@/lib/countries/catalog";
import { ensureLaunchCatalog } from "@/lib/countries/sync";
import { billedAmountLabel, SUBSCRIPTION_CURRENCY, subscriptionPriceLabel } from "@/lib/subscription";

export default async function AdminCountriesPage() {
  await ensureLaunchCatalog();
  const rows = await prisma.country.findMany({ orderBy: { tier: "asc" } });
  const byIso = new Map(LAUNCH_COUNTRIES.map((country) => [country.iso2, country]));

  return (
    <main>
      <h1 className="serif text-4xl">Countries</h1>
      <p className="mt-2 text-ink-soft">
        Open markets in this order. Visitors are sent to their country from IP and browser language, or the country they
        pick. The UI follows that country&apos;s language. Billing is one Stripe subscription:{" "}
        {subscriptionPriceLabel()} in {SUBSCRIPTION_CURRENCY} for every country.
      </p>
      <p className="mt-2 text-sm text-ink-soft">
        Turn a country on only when it has listings. Search stays on the UK until then.
      </p>
      <ul className="mt-6 grid gap-2">
        {rows.map((country) => {
          const meta = byIso.get(country.iso2);
          return (
            <li key={country.id} className="card flex items-center justify-between gap-3 p-4">
              <div>
                <p className="font-semibold">
                  {country.tier}. {meta?.nativeName ?? country.name} ({country.iso2.toUpperCase()})
                </p>
                <p className="text-sm text-ink-soft">
                  {meta?.htmlLang ?? country.locale}
                  {meta?.dir === "rtl" ? " · RTL" : ""} · local {country.currency} · billed{" "}
                  {billedAmountLabel()} ·{" "}
                  {country.active ? "live" : "not yet"}
                </p>
              </div>
              <form action={toggleCountry}>
                <input type="hidden" name="id" value={country.id} />
                <button className="btn btn-ghost" type="submit">
                  {country.active ? "Deactivate" : "Activate"}
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
