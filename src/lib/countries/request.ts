import { cache } from "react";
import { cookies, headers } from "next/headers";
import { COUNTRY_COOKIE } from "@/lib/constants";
import {
  countryFromPathname,
  getLaunchCountry,
  languageForCountry,
  type LaunchCountry,
} from "@/lib/countries/catalog";
import { resolveVisitorCountry } from "@/lib/countries/detect";
import { uiCopy } from "@/lib/i18n/copy";

export const getRequestCountry = cache(async (): Promise<LaunchCountry> => {
  const jar = await cookies();
  const hdrs = await headers();
  const pathname = hdrs.get("x-pathname") ?? hdrs.get("next-url") ?? "";
  return resolveVisitorCountry({
    pathCountry: countryFromPathname(pathname)?.iso2 ?? hdrs.get("x-page-country"),
    cookie: jar.get(COUNTRY_COOKIE)?.value,
    geo: hdrs.get("x-vercel-ip-country") ?? hdrs.get("cf-ipcountry") ?? hdrs.get("x-country"),
    acceptLanguage: hdrs.get("accept-language"),
  });
});

export const getRequestUi = cache(async () => {
  const country = await getRequestCountry();
  const hdrs = await headers();
  const language = languageForCountry(country, hdrs.get("accept-language"));
  return {
    country,
    language,
    copy: uiCopy(language),
    htmlLang: language === "fr" && country.iso2 === "ca" ? "fr-CA" : country.htmlLang,
    dir: language === "ar" ? "rtl" : country.dir,
  };
});

export function liveCountryOrDefault(iso2: string, liveIso2s: string[]) {
  if (liveIso2s.includes(iso2)) return getLaunchCountry(iso2);
  return getLaunchCountry("gb");
}
