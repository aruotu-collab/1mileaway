import { describe, expect, it } from "vitest";
import { publicCallPhone, toTelHref } from "@/lib/phone";

describe("publicCallPhone", () => {
  it("only exposes a claimed professional's own number", () => {
    expect(publicCallPhone({ claimStatus: "CLAIMED", phoneReal: "020 7946 0101" })).toBe("020 7946 0101");
    expect(publicCallPhone({ claimStatus: "UNCLAIMED", phoneReal: "020 7946 0101" })).toBeNull();
    expect(publicCallPhone({ claimStatus: "CLAIMED", phoneReal: null })).toBeNull();
  });
});

describe("toTelHref", () => {
  it("builds a tel link from a display number", () => {
    expect(toTelHref("020 7946 0101")).toBe("tel:02079460101");
  });
});
