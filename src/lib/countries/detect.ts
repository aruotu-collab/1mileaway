import { DEFAULT_COUNTRY, getLaunchCountry, isLaunchCountry, type LaunchCountry } from "@/lib/countries/catalog";

export function countryFromGeoHeader(value?: string | null) {
  const iso2 = value?.trim().toLowerCase();
  if (!iso2 || iso2.length !== 2 || iso2 === "xx" || iso2 === "t1") return null;
  if (iso2 === "uk") return getLaunchCountry("gb");
  if (!isLaunchCountry(iso2)) return null;
  return getLaunchCountry(iso2);
}

export function countryFromAcceptLanguage(header?: string | null) {
  if (!header) return null;
  const tags = header
    .split(",")
    .map((part) => part.split(";")[0]?.trim().toLowerCase())
    .filter(Boolean);
  for (const tag of tags) {
    if (tag.startsWith("en-gb") || tag === "en-uk") return getLaunchCountry("gb");
    if (tag.startsWith("en-us")) return getLaunchCountry("us");
    if (tag.startsWith("en-ca") || tag.startsWith("fr-ca")) return getLaunchCountry("ca");
    if (tag.startsWith("en-au")) return getLaunchCountry("au");
    if (tag.startsWith("en-ie")) return getLaunchCountry("ie");
    if (tag.startsWith("en-nz")) return getLaunchCountry("nz");
    if (tag.startsWith("en-za")) return getLaunchCountry("za");
    if (tag.startsWith("en-in")) return getLaunchCountry("in");
    if (tag.startsWith("en-ph")) return getLaunchCountry("ph");
    if (tag.startsWith("en-ng")) return getLaunchCountry("ng");
    if (tag.startsWith("de")) return getLaunchCountry("de");
    if (tag.startsWith("fr")) return getLaunchCountry("fr");
    if (tag.startsWith("es-mx")) return getLaunchCountry("mx");
    if (tag.startsWith("es")) return getLaunchCountry("es");
    if (tag.startsWith("it")) return getLaunchCountry("it");
    if (tag.startsWith("nl")) return getLaunchCountry("nl");
    if (tag.startsWith("pl")) return getLaunchCountry("pl");
    if (tag.startsWith("ar-sa")) return getLaunchCountry("sa");
    if (tag.startsWith("ar-ae") || tag.startsWith("ar")) return getLaunchCountry("ae");
    if (tag.startsWith("pt")) return getLaunchCountry("br");
  }
  return null;
}

export function resolveVisitorCountry(input: {
  cookie?: string | null;
  geo?: string | null;
  acceptLanguage?: string | null;
  pathCountry?: string | null;
}): LaunchCountry {
  if (input.pathCountry && isLaunchCountry(input.pathCountry)) return getLaunchCountry(input.pathCountry);
  if (input.cookie && isLaunchCountry(input.cookie)) return getLaunchCountry(input.cookie);
  return countryFromGeoHeader(input.geo) ?? countryFromAcceptLanguage(input.acceptLanguage) ?? getLaunchCountry(DEFAULT_COUNTRY);
}
