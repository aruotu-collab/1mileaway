import { describe, expect, it } from "vitest";
import { hasReachableContact, isPublicListing } from "@/lib/listings/visibility";

describe("listing visibility", () => {
  it("treats a phone-only listing as reachable", () => {
    expect(hasReachableContact({ phoneReal: "+442079460101" })).toBe(true);
    expect(hasReachableContact({ contactEmail: "hello@smith.test" })).toBe(true);
    expect(hasReachableContact({ contactEmail: " ", phoneDisplay: "" })).toBe(false);
  });

  it("hides unclaimed listings with no email and no phone", () => {
    expect(
      isPublicListing({
        claimStatus: "UNCLAIMED",
        contactEmail: null,
        phoneReal: null,
        phoneDisplay: null,
      }),
    ).toBe(false);
    expect(
      isPublicListing({
        claimStatus: "UNCLAIMED",
        phoneDisplay: "020 7946 0101",
      }),
    ).toBe(true);
    expect(isPublicListing({ claimStatus: "CLAIMED", contactEmail: null, phoneReal: null })).toBe(true);
  });
});
