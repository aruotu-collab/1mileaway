import { describe, expect, it } from "vitest";
import { compassBearing } from "@/lib/utils";
import { radarDot, radarPlots } from "@/lib/radar";

describe("compassBearing", () => {
  it("points roughly north from Catford toward Lewisham", () => {
    const bearing = compassBearing({ lat: 51.4452, lng: -0.0209 }, { lat: 51.4613, lng: -0.0103 });
    expect(bearing).toBeGreaterThan(0);
    expect(bearing).toBeLessThan(90);
  });
});

describe("radarPlots", () => {
  it("keeps plots inside the circle", () => {
    const plots = radarPlots(
      [
        { id: "near", distanceMiles: 0.4, lat: 51.45, lng: -0.02 },
        { id: "far", distanceMiles: 3.2, lat: 51.47, lng: -0.01 },
      ],
      { lat: 51.4452, lng: -0.0209 },
    );
    expect(plots).toHaveLength(2);
    for (const plot of plots) {
      expect(plot.left).toBeGreaterThanOrEqual(14);
      expect(plot.left).toBeLessThanOrEqual(86);
      expect(plot.top).toBeGreaterThanOrEqual(14);
      expect(plot.top).toBeLessThanOrEqual(86);
    }
  });

  it("spreads listings that share the search origin", () => {
    const origin = { lat: 51.4452, lng: -0.0209 };
    const plots = radarPlots(
      [
        { id: "a", distanceMiles: 0.4, lat: origin.lat, lng: origin.lng },
        { id: "b", distanceMiles: 0.5, lat: origin.lat, lng: origin.lng },
        { id: "c", distanceMiles: 0.7, lat: origin.lat, lng: origin.lng },
      ],
      origin,
    );
    const lefts = plots.map((plot) => Math.round(plot.left));
    expect(new Set(lefts).size).toBeGreaterThan(1);
  });
});

describe("radarDot", () => {
  it("places farther listings closer to the rim", () => {
    const near = radarDot(0.4);
    const far = radarDot(2.8);
    const nearOffset = Math.hypot(near.left - 50, near.top - 50);
    const farOffset = Math.hypot(far.left - 50, far.top - 50);
    expect(farOffset).toBeGreaterThan(nearOffset);
  });
});
