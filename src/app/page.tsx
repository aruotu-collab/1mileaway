import Link from "next/link";
import { MarketplaceSearch } from "@/components/marketplace-search";
import { setVisitorCountry } from "@/app/actions/country";
import { getRequestUi } from "@/lib/countries/request";
import { ensureLaunchCountriesIfNeeded } from "@/lib/countries/sync";
import { prisma } from "@/lib/db";
import { fillCountry } from "@/lib/i18n/copy";

export default async function HomePage() {
  const ui = await getRequestUi();
  await ensureLaunchCountriesIfNeeded();
  const [countryRow, locationCount] = await Promise.all([
    prisma.country.findUnique({ where: { iso2: ui.country.iso2 } }),
    prisma.location.count({
      where: { active: true, type: { in: ["district", "city"] }, country: { iso2: ui.country.iso2 } },
    }),
  ]);
  const live = Boolean(countryRow?.active && locationCount > 0);

  return (
    <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-deep sm:text-xs">
        {ui.copy.eyebrow}
      </p>
      {live ? (
        <>
          <h1 className="serif mt-1.5 max-w-3xl text-3xl font-medium leading-snug sm:mt-2 sm:text-4xl">
            {ui.copy.homeTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">{ui.copy.homeLead}</p>
          <div className="mt-4" id="search">
            <MarketplaceSearch country={ui.country.iso2} defaultLocation="" />
          </div>
        </>
      ) : (
        <>
          <h1 className="serif mt-1.5 max-w-3xl text-3xl font-medium leading-snug sm:mt-2 sm:text-4xl">
            {ui.copy.comingTitle}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-ink-soft sm:text-base">
            {fillCountry(ui.copy.comingLead, ui.country.nativeName)}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <form action={setVisitorCountry}>
              <input type="hidden" name="country" value="gb" />
              <button className="btn btn-primary" type="submit">
                {ui.copy.comingCta}
              </button>
            </form>
            <Link href="/for-professionals" className="btn btn-ghost">
              {ui.copy.forProfessionals}
            </Link>
          </div>
        </>
      )}

      <section className="card mt-12 p-6 sm:mt-14 sm:p-8">
        <h2 className="serif text-2xl sm:text-3xl">{ui.copy.proCardTitle}</h2>
        <p className="mt-3 max-w-xl text-ink-soft">{ui.copy.proCardLead}</p>
        <Link href="/for-professionals" className="btn btn-primary mt-5">
          {ui.copy.forProfessionals}
        </Link>
      </section>
    </main>
  );
}
