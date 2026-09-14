import { describe, expect, it } from "vitest";
import { haversineMiles } from "@/lib/utils";

describe("haversineMiles", () => {
  it("measures Catford to Lewisham as under 2 miles", () => {
    const miles = haversineMiles(
      { lat: 51.4452, lng: -0.0209 },
      { lat: 51.4613, lng: -0.0103 },
    );
    expect(miles).toBeGreaterThan(0.5);
    expect(miles).toBeLessThan(2);
  });
});
