import { describe, expect, it } from "vitest";
import {
  LAUNCH_COUNTRIES,
  countryFromPathname,
  getLaunchCountry,
  languageForCountry,
  stripeCheckoutLocale,
} from "@/lib/countries/catalog";
import { resolveVisitorCountry } from "@/lib/countries/detect";

describe("launch countries", () => {
  it("opens in the agreed order with UK first", () => {
    expect(LAUNCH_COUNTRIES.map((country) => country.iso2).slice(0, 6)).toEqual([
      "gb",
      "us",
      "ca",
      "au",
      "ie",
      "nz",
    ]);
    expect(LAUNCH_COUNTRIES).toHaveLength(20);
    expect(LAUNCH_COUNTRIES.at(-1)?.iso2).toBe("br");
  });

  it("uses Arabic RTL for the Gulf", () => {
    expect(getLaunchCountry("ae").dir).toBe("rtl");
    expect(getLaunchCountry("sa").language).toBe("ar");
    expect(stripeCheckoutLocale("ar")).toBe("ar");
    expect(stripeCheckoutLocale("pt")).toBe("pt-BR");
  });
});

describe("resolveVisitorCountry", () => {
  it("prefers the URL, then the cookie, then geo, then language", () => {
    expect(
      resolveVisitorCountry({ pathCountry: "de", cookie: "us", geo: "FR", acceptLanguage: "en-GB" }).iso2,
    ).toBe("de");
    expect(resolveVisitorCountry({ cookie: "mx", geo: "US" }).iso2).toBe("mx");
    expect(resolveVisitorCountry({ geo: "UK" }).iso2).toBe("gb");
    expect(resolveVisitorCountry({ acceptLanguage: "pt-BR,pt;q=0.9" }).iso2).toBe("br");
    expect(resolveVisitorCountry({}).iso2).toBe("gb");
  });

  it("reads Canada French from the browser language", () => {
    expect(languageForCountry(getLaunchCountry("ca"), "fr-CA,fr;q=0.9")).toBe("fr");
    expect(languageForCountry(getLaunchCountry("ca"), "en-CA")).toBe("en");
  });

  it("ignores reserved paths as countries", () => {
    expect(countryFromPathname("/admin")).toBeNull();
    expect(countryFromPathname("/gb/plumbers/catford")?.iso2).toBe("gb");
  });
});
