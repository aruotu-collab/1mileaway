import { describe, expect, it } from "vitest";
import { PROFESSION_DEFS } from "@/lib/profession-catalog";
import { claimCompletePath, displayCategoryName, groupedProfessions, parseProfessionIds } from "@/lib/professions";

describe("groupedProfessions", () => {
  it("keeps trades under their category headings", () => {
    const groups = groupedProfessions([
      { slug: "gardeners", label: "Gardeners", category: "Garden", categoryOrder: 3 },
      { slug: "plumbers", label: "Plumbers", category: "Home & repairs", categoryOrder: 1 },
      { slug: "locksmiths", label: "Locksmiths", category: "Home & repairs", categoryOrder: 1 },
      { slug: "cleaners", label: "Cleaners", category: "Cleaning", categoryOrder: 4 },
    ]);
    expect(groups.map((group) => group.name)).toEqual(["Home & repairs", "Garden", "Cleaning"]);
    expect(groups[0]?.items.map((item) => item.slug)).toEqual(["plumbers", "locksmiths"]);
  });
});

describe("profession catalog", () => {
  it("includes the requested mobile services", () => {
    const ids = PROFESSION_DEFS.map((def) => def.internalId);
    expect(ids).toEqual(expect.arrayContaining(["mobile_tyre", "mobile_car_cleaning", "mobile_laundry"]));
    expect(PROFESSION_DEFS.filter((def) => def.categorySlug === "mobile").length).toBeGreaterThanOrEqual(6);
  });

  it("includes personal care, teaching and childcare", () => {
    const ids = PROFESSION_DEFS.map((def) => def.internalId);
    expect(ids).toEqual(
      expect.arrayContaining(["hairdresser", "massage", "music_teacher", "childminder", "tutor", "dog_walker"]),
    );
  });
});

describe("displayCategoryName", () => {
  it("uses a customer-facing name for home emergency trades", () => {
    expect(displayCategoryName("home-emergency", "Home emergency")).toBe("Home & repairs");
    expect(displayCategoryName("garden", "Garden")).toBe("Garden");
  });
});

describe("parseProfessionIds", () => {
  it("keeps unique ids from checkboxes and query strings", () => {
    expect(parseProfessionIds(["plumber-id", " plumber-id ", "heating-id"])).toEqual(["plumber-id", "heating-id"]);
    expect(parseProfessionIds("plumber-id,heating-id,plumber-id")).toEqual(["plumber-id", "heating-id"]);
    expect(parseProfessionIds("")).toEqual([]);
    expect(parseProfessionIds(null)).toEqual([]);
  });
});

describe("claimCompletePath", () => {
  it("carries selected trades through the magic-link return url", () => {
    expect(claimCompletePath("abc", ["heat", "plumb"])).toBe("/claim/complete?token=abc&professions=heat%2Cplumb");
    expect(claimCompletePath("abc")).toBe("/claim/complete?token=abc");
  });
});

describe("uniqueProfessionIds", () => {
  it("drops blanks", () => {
    expect(parseProfessionIds(["", " a ", " "])).toEqual(["a"]);
  });
});
