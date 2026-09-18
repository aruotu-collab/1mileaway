export const DEFAULT_COUNTRY = "gb";

export type UiLanguage = "en" | "de" | "fr" | "es" | "it" | "nl" | "pl" | "ar" | "pt";

export type LaunchCountry = {
  iso2: string;
  name: string;
  nativeName: string;
  locale: string;
  language: UiLanguage;
  htmlLang: string;
  timezone: string;
  localCurrency: string;
  launchOrder: number;
  dir: "ltr" | "rtl";
};

export const LAUNCH_COUNTRIES: LaunchCountry[] = [
  { iso2: "gb", name: "United Kingdom", nativeName: "United Kingdom", locale: "en-GB", language: "en", htmlLang: "en-GB", timezone: "Europe/London", localCurrency: "GBP", launchOrder: 1, dir: "ltr" },
  { iso2: "us", name: "United States", nativeName: "United States", locale: "en-US", language: "en", htmlLang: "en-US", timezone: "America/Chicago", localCurrency: "USD", launchOrder: 2, dir: "ltr" },
  { iso2: "ca", name: "Canada", nativeName: "Canada", locale: "en-CA", language: "en", htmlLang: "en-CA", timezone: "America/Toronto", localCurrency: "CAD", launchOrder: 3, dir: "ltr" },
  { iso2: "au", name: "Australia", nativeName: "Australia", locale: "en-AU", language: "en", htmlLang: "en-AU", timezone: "Australia/Sydney", localCurrency: "AUD", launchOrder: 4, dir: "ltr" },
  { iso2: "ie", name: "Ireland", nativeName: "Ireland", locale: "en-IE", language: "en", htmlLang: "en-IE", timezone: "Europe/Dublin", localCurrency: "EUR", launchOrder: 5, dir: "ltr" },
  { iso2: "nz", name: "New Zealand", nativeName: "New Zealand", locale: "en-NZ", language: "en", htmlLang: "en-NZ", timezone: "Pacific/Auckland", localCurrency: "NZD", launchOrder: 6, dir: "ltr" },
  { iso2: "de", name: "Germany", nativeName: "Deutschland", locale: "de-DE", language: "de", htmlLang: "de-DE", timezone: "Europe/Berlin", localCurrency: "EUR", launchOrder: 7, dir: "ltr" },
  { iso2: "fr", name: "France", nativeName: "France", locale: "fr-FR", language: "fr", htmlLang: "fr-FR", timezone: "Europe/Paris", localCurrency: "EUR", launchOrder: 8, dir: "ltr" },
  { iso2: "es", name: "Spain", nativeName: "España", locale: "es-ES", language: "es", htmlLang: "es-ES", timezone: "Europe/Madrid", localCurrency: "EUR", launchOrder: 9, dir: "ltr" },
  { iso2: "it", name: "Italy", nativeName: "Italia", locale: "it-IT", language: "it", htmlLang: "it-IT", timezone: "Europe/Rome", localCurrency: "EUR", launchOrder: 10, dir: "ltr" },
  { iso2: "nl", name: "Netherlands", nativeName: "Nederland", locale: "nl-NL", language: "nl", htmlLang: "nl-NL", timezone: "Europe/Amsterdam", localCurrency: "EUR", launchOrder: 11, dir: "ltr" },
  { iso2: "pl", name: "Poland", nativeName: "Polska", locale: "pl-PL", language: "pl", htmlLang: "pl-PL", timezone: "Europe/Warsaw", localCurrency: "PLN", launchOrder: 12, dir: "ltr" },
  { iso2: "ae", name: "United Arab Emirates", nativeName: "الإمارات", locale: "ar-AE", language: "ar", htmlLang: "ar-AE", timezone: "Asia/Dubai", localCurrency: "AED", launchOrder: 13, dir: "rtl" },
  { iso2: "sa", name: "Saudi Arabia", nativeName: "السعودية", locale: "ar-SA", language: "ar", htmlLang: "ar-SA", timezone: "Asia/Riyadh", localCurrency: "SAR", launchOrder: 14, dir: "rtl" },
  { iso2: "za", name: "South Africa", nativeName: "South Africa", locale: "en-ZA", language: "en", htmlLang: "en-ZA", timezone: "Africa/Johannesburg", localCurrency: "ZAR", launchOrder: 15, dir: "ltr" },
  { iso2: "in", name: "India", nativeName: "India", locale: "en-IN", language: "en", htmlLang: "en-IN", timezone: "Asia/Kolkata", localCurrency: "INR", launchOrder: 16, dir: "ltr" },
  { iso2: "ph", name: "Philippines", nativeName: "Philippines", locale: "en-PH", language: "en", htmlLang: "en-PH", timezone: "Asia/Manila", localCurrency: "PHP", launchOrder: 17, dir: "ltr" },
  { iso2: "ng", name: "Nigeria", nativeName: "Nigeria", locale: "en-NG", language: "en", htmlLang: "en-NG", timezone: "Africa/Lagos", localCurrency: "NGN", launchOrder: 18, dir: "ltr" },
  { iso2: "mx", name: "Mexico", nativeName: "México", locale: "es-MX", language: "es", htmlLang: "es-MX", timezone: "America/Mexico_City", localCurrency: "MXN", launchOrder: 19, dir: "ltr" },
  { iso2: "br", name: "Brazil", nativeName: "Brasil", locale: "pt-BR", language: "pt", htmlLang: "pt-BR", timezone: "America/Sao_Paulo", localCurrency: "BRL", launchOrder: 20, dir: "ltr" },
];

const CALLING_CODES: Record<string, string> = {
  gb: "+44",
  us: "+1",
  ca: "+1",
  au: "+61",
  ie: "+353",
  nz: "+64",
  de: "+49",
  fr: "+33",
  es: "+34",
  it: "+39",
  nl: "+31",
  pl: "+48",
  ae: "+971",
  sa: "+966",
  za: "+27",
  in: "+91",
  ph: "+63",
  ng: "+234",
  mx: "+52",
  br: "+55",
};

const byIso2 = new Map(LAUNCH_COUNTRIES.map((country) => [country.iso2, country]));

export function callingCodeForCountry(iso2: string) {
  return CALLING_CODES[iso2.toLowerCase()] ?? CALLING_CODES[DEFAULT_COUNTRY] ?? "+44";
}

export function isLaunchCountry(iso2: string) {
  return byIso2.has(iso2.toLowerCase());
}

export function getLaunchCountry(iso2?: string | null) {
  if (!iso2) return byIso2.get(DEFAULT_COUNTRY)!;
  return byIso2.get(iso2.toLowerCase()) ?? byIso2.get(DEFAULT_COUNTRY)!;
}

export function countryFromPathname(pathname: string) {
  const match = pathname.match(/^\/([a-z]{2})(?:\/|$)/i);
  if (!match?.[1] || !isLaunchCountry(match[1]) || isReservedCountryPath(match[1])) return null;
  return getLaunchCountry(match[1]);
}

export function pathForCountry(pathname: string, iso2: string) {
  const path = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname.split("?")[0] || "/" : "/";
  const current = countryFromPathname(path);
  if (!current) return path;
  const rest = path.slice(current.iso2.length + 1) || "/";
  return rest === "/" ? `/${iso2}` : `/${iso2}${rest}`;
}

export function languageForCountry(country: LaunchCountry, acceptLanguage?: string | null) {
  if (country.iso2 === "ca" && acceptLanguage?.toLowerCase().includes("fr")) return "fr" as const;
  return country.language;
}

export function stripeCheckoutLocale(language: UiLanguage) {
  if (language === "pt") return "pt-BR";
  return language;
}

const RESERVED = new Set([
  "admin",
  "login",
  "join",
  "professional",
  "privacy",
  "cookies",
  "terms",
  "call",
  "claim",
  "pay",
  "auth",
  "action",
  "api",
  "for-professionals",
  "contact",
]);

export function isReservedCountryPath(iso2: string) {
  return RESERVED.has(iso2.toLowerCase());
}
