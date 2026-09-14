import { describe, expect, it } from "vitest";
import { isIndexable, robotsDirective } from "@/lib/seo/indexability";

describe("indexability", () => {
  it("does not index thin doorway pages", () => {
    expect(
      isIndexable({ listingCount: 1, uniqueBusinesses: 1, hasLocalCopy: false }),
    ).toBe(false);
    expect(robotsDirective(false)).toContain("noindex");
  });

  it("indexes pages with enough real listings", () => {
    expect(
      isIndexable({ listingCount: 4, uniqueBusinesses: 3, hasLocalCopy: true }),
    ).toBe(true);
  });

  it("respects admin override", () => {
    expect(
      isIndexable({ listingCount: 10, uniqueBusinesses: 8, hasLocalCopy: true, overrideNoindex: true }),
    ).toBe(false);
  });
});
