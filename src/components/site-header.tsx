import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth/session";
import { CountryPicker } from "@/components/country-picker";
import { SiteNav } from "@/components/site-nav";
import { LAUNCH_COUNTRIES } from "@/lib/countries/catalog";
import { getRequestUi } from "@/lib/countries/request";
import { prisma } from "@/lib/db";

export async function SiteHeader() {
  const [user, ui, live] = await Promise.all([
    getSession(),
    getRequestUi(),
    prisma.country.findMany({ where: { active: true }, select: { iso2: true } }),
  ]);
  const liveIso2 = live.map((row) => row.iso2);

  return (
    <header className="border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:gap-3">
        <Link href="/" className="serif shrink-0 text-xl font-semibold tracking-tight">
          1mileaway
        </Link>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <CountryPicker
            current={ui.country.iso2}
            liveIso2={liveIso2}
            label={ui.copy.countryLabel}
            liveBadge={ui.copy.liveBadge}
            soonBadge={ui.copy.soonBadge}
            countries={LAUNCH_COUNTRIES}
          />
          <SiteNav
            signedIn={Boolean(user)}
            admin={user ? isAdmin(user.role) : false}
            labels={ui.copy}
          />
        </div>
      </div>
    </header>
  );
}
