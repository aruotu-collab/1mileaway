import { describe, expect, it } from "vitest";
import { formatDistanceMiles, milesBetween } from "@/lib/locations/distance";

describe("milesBetween", () => {
  it("measures Catford to Lewisham as about a mile", () => {
    const miles = milesBetween({ lat: 51.4452, lng: -0.0209 }, { lat: 51.4613, lng: -0.0103 });
    expect(miles).toBeGreaterThan(1);
    expect(miles).toBeLessThan(1.5);
  });

  it("returns null when a point is missing", () => {
    expect(milesBetween({ lat: 51.4452, lng: -0.0209 }, null)).toBeNull();
  });
});

describe("formatDistanceMiles", () => {
  it("does not invent a number when the distance is unknown", () => {
    expect(formatDistanceMiles(null)).toBe("Distance not known yet");
  });

  it("says in this area instead of 0.0 miles", () => {
    expect(formatDistanceMiles(0.02)).toBe("In this area");
    expect(formatDistanceMiles(0.6)).toBe("0.6 miles from this area");
    expect(formatDistanceMiles(0.6, true)).toBe("0.6 miles from you");
  });
});
