"use client";

import { setVisitorCountry } from "@/app/actions/country";
import type { LaunchCountry } from "@/lib/countries/catalog";

export function CountryPicker({
  current,
  liveIso2,
  label,
  liveBadge,
  soonBadge,
  countries,
}: {
  current: string;
  liveIso2: string[];
  label: string;
  liveBadge: string;
  soonBadge: string;
  countries: LaunchCountry[];
}) {
  return (
    <form action={setVisitorCountry} className="shrink-0">
      <label className="sr-only" htmlFor="country-picker">
        {label}
      </label>
      <select
        id="country-picker"
        name="country"
        defaultValue={current}
        className="max-w-[9.5rem] rounded-full border border-line bg-paper px-2 py-1.5 text-xs font-medium text-ink sm:max-w-[12rem] sm:text-sm"
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
      >
        {countries.map((country) => (
          <option key={country.iso2} value={country.iso2}>
            {country.nativeName}
            {liveIso2.includes(country.iso2) ? ` · ${liveBadge}` : ` · ${soonBadge}`}
          </option>
        ))}
      </select>
    </form>
  );
}
