import { describe, expect, it } from "vitest";
import { marketplaceHref } from "@/lib/search/marketplace";
import { safeInternalPath, withQuery } from "@/lib/navigation";

describe("marketplaceHref", () => {
  it("uses the emergency slug when the profession has one", () => {
    expect(
      marketplaceHref({
        country: "gb",
        professionSlug: "plumbers",
        emergencySlug: "emergency-plumbers",
        emergency: true,
        locationSlug: "catford",
      }),
    ).toBe("/gb/emergency-plumbers/catford");
  });

  it("keeps the ordinary slug and sorts by available when there is no emergency page", () => {
    expect(
      marketplaceHref({
        country: "gb",
        professionSlug: "hairdressers",
        emergencySlug: null,
        emergency: true,
        locationSlug: "lewisham",
      }),
    ).toBe("/gb/hairdressers/lewisham?sort=available");
  });

  it("adds near/lat/lng for typed places so back/forward can restore the search", () => {
    expect(
      marketplaceHref({
        country: "gb",
        professionSlug: "plumbers",
        emergency: false,
        locationSlug: "catford",
        near: { label: "SE6 4AA", lat: 51.44, lng: -0.02 },
      }),
    ).toBe("/gb/plumbers/catford?near=SE6+4AA&lat=51.44&lng=-0.02");
  });
});

describe("safeInternalPath", () => {
  it("rejects off-site or protocol-relative values", () => {
    expect(safeInternalPath("//evil.test", "/")).toBe("/");
    expect(safeInternalPath("https://evil.test", "/gb")).toBe("/gb");
    expect(safeInternalPath("/gb/plumbers/catford", "/")).toBe("/gb/plumbers/catford");
  });
});

describe("withQuery", () => {
  it("omits empty params so filter chips can be toggled cleanly", () => {
    expect(withQuery("/gb/plumbers/catford", { sort: "nearest", near: undefined })).toBe(
      "/gb/plumbers/catford?sort=nearest",
    );
  });
});
