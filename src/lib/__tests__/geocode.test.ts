import { describe, expect, it } from "vitest";
import { isUkPostcode } from "@/lib/locations/geocode";

describe("isUkPostcode", () => {
  it("accepts full and outward postcodes", () => {
    expect(isUkPostcode("SE6 4AA")).toBe(true);
    expect(isUkPostcode("se64aa")).toBe(true);
    expect(isUkPostcode("SE6")).toBe(true);
    expect(isUkPostcode("SW1A 1AA")).toBe(true);
  });

  it("rejects ordinary place names", () => {
    expect(isUkPostcode("Catford")).toBe(false);
    expect(isUkPostcode("12 Rushey Green")).toBe(false);
  });
});
