import { describe, expect, it } from "vitest";
import { rankListings, type Rankable } from "@/lib/ranking/engine";

function listing(partial: Partial<Rankable> & Pick<Rankable, "id" | "name">): Rankable {
  return {
    distanceMiles: 3,
    availabilityStatus: "UNKNOWN",
    availabilityExpiresAt: null,
    availabilityConfirmedAt: null,
    answerRate: 0.5,
    ratingAvg: 4,
    ratingCount: 4,
    claimStatus: "CLAIMED",
    paymentState: "FREE_TRIAL_ACTIVE",
    sponsoredUntil: null,
    rankingBoost: 0,
    rankingBoostUntil: null,
    ...partial,
  };
}

describe("rankListings", () => {
  it("prefers available now over a slightly closer unknown listing", () => {
    const ranked = rankListings([
      listing({ id: "near", name: "Near", distanceMiles: 0.4, availabilityStatus: "UNKNOWN" }),
      listing({
        id: "ready",
        name: "Ready",
        distanceMiles: 0.9,
        availabilityStatus: "AVAILABLE_NOW",
        availabilityExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      }),
    ]);
    expect(ranked[0].id).toBe("ready");
  });

  it("marks live sponsored listings", () => {
    const ranked = rankListings([
      listing({
        id: "ad",
        name: "Ad",
        sponsoredUntil: new Date(Date.now() + 86400000),
      }),
    ]);
    expect(ranked[0].sponsored).toBe(true);
    expect(ranked[0].explanation.sponsored).toBe(1);
  });

  it("treats expired availability as unknown", () => {
    const ranked = rankListings([
      listing({
        id: "stale",
        name: "Stale",
        availabilityStatus: "AVAILABLE_NOW",
        availabilityExpiresAt: new Date(Date.now() - 1000),
      }),
      listing({
        id: "fresh",
        name: "Fresh",
        availabilityStatus: "AVAILABLE_TODAY",
        availabilityExpiresAt: new Date(Date.now() + 1000),
      }),
    ]);
    expect(ranked[0].id).toBe("fresh");
  });
});
