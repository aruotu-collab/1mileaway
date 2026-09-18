import { describe, expect, it } from "vitest";
import { filterLocationSuggestions, locationTypedHint } from "@/lib/locations/suggest";

const locations = [
  { slug: "catford", name: "Catford" },
  { slug: "lewisham", name: "Lewisham" },
  { slug: "croydon", name: "Croydon" },
];

describe("filterLocationSuggestions", () => {
  it("returns every area when the field is empty", () => {
    expect(filterLocationSuggestions(locations, "")).toEqual(locations);
  });

  it("keeps the full list when an area is already chosen", () => {
    expect(filterLocationSuggestions(locations, "Catford")).toEqual(locations);
    expect(filterLocationSuggestions(locations, "LEWISHAM")).toEqual(locations);
  });

  it("filters by name or slug while typing", () => {
    expect(filterLocationSuggestions(locations, "cat")).toEqual([{ slug: "catford", name: "Catford" }]);
    expect(filterLocationSuggestions(locations, "lew")).toEqual([{ slug: "lewisham", name: "Lewisham" }]);
  });
});

describe("locationTypedHint", () => {
  it("skips the hint when the typed value is an area name", () => {
    expect(locationTypedHint("Catford", locations)).toBeNull();
  });

  it("offers a postcode or address search for other text", () => {
    expect(locationTypedHint("SE6 4AA", [])).toBe("Use SE6 4AA as a postcode");
    expect(locationTypedHint("12 Rushey Green", [])).toBe(
      "Use “12 Rushey Green” as a postcode or street address",
    );
  });
});
