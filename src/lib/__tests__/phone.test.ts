import { describe, expect, it } from "vitest";
import { LAUNCH_COUNTRIES } from "@/lib/countries/catalog";
import {
  canRequestTradesman,
  nationalNumberForInput,
  normalizeListingPhone,
  phonePlaceholder,
  publicCallPhone,
  toE164,
  toTelHref,
} from "@/lib/phone";

describe("publicCallPhone", () => {
  it("only exposes a subscribed professional's own number", () => {
    expect(
      publicCallPhone({
        claimStatus: "CLAIMED",
        paymentState: "SUBSCRIPTION_ACTIVE",
        phoneReal: "020 7946 0101",
      }),
    ).toBe("020 7946 0101");
    expect(publicCallPhone({ claimStatus: "CLAIMED", paymentState: "UNSUBSCRIBED", phoneReal: "020 7946 0101" })).toBeNull();
    expect(
      publicCallPhone({
        claimStatus: "CLAIMED",
        paymentState: "SUBSCRIPTION_TRIALING",
        phoneReal: "020 7946 0101",
        currentPeriodEnd: new Date(Date.now() + 86400000),
      }),
    ).toBe("020 7946 0101");
    expect(
      publicCallPhone({
        claimStatus: "CLAIMED",
        paymentState: "SUBSCRIPTION_TRIALING",
        phoneReal: "020 7946 0101",
        currentPeriodEnd: new Date(Date.now() - 1000),
      }),
    ).toBeNull();
    expect(publicCallPhone({ claimStatus: "UNCLAIMED", paymentState: "SUBSCRIPTION_ACTIVE", phoneReal: "020 7946 0101" })).toBeNull();
  });
});

describe("canRequestTradesman", () => {
  it("lets customers ask unclaimed listings that have an email", () => {
    expect(canRequestTradesman({ claimStatus: "UNCLAIMED", contactEmail: "dan@demo.1mileaway.com" })).toBe(true);
    expect(canRequestTradesman({ claimStatus: "UNCLAIMED", contactEmail: null })).toBe(false);
    expect(canRequestTradesman({ claimStatus: "CLAIMED" })).toBe(true);
  });
});

describe("toTelHref", () => {
  it("builds a tel link from a display number", () => {
    expect(toTelHref("020 7946 0101")).toBe("tel:02079460101");
    expect(toTelHref("+44 2079460101")).toBe("tel:+442079460101");
  });
});

describe("toE164", () => {
  it("adds the country calling code and drops a UK trunk 0", () => {
    expect(toE164("020 7946 0101", "gb")).toBe("+442079460101");
    expect(toE164("07911 123456", "gb")).toBe("+447911123456");
    expect(toE164("+44 20 7946 0101", "gb")).toBe("+442079460101");
    expect(toE164("442079460101", "gb")).toBe("+442079460101");
    expect(toE164("202 555 0100", "us")).toBe("+12025550100");
    expect(toE164("06 1234 5678", "it")).toBe("+390612345678");
    expect(toE164("12", "gb")).toBeNull();
  });
});

describe("normalizeListingPhone", () => {
  it("stores E.164 for Call now and a readable display value", () => {
    expect(normalizeListingPhone("020 7946 0101", "gb")).toEqual({
      phoneReal: "+442079460101",
      phoneDisplay: "+44 2079460101",
    });
    expect(nationalNumberForInput("+442079460101", "gb")).toBe("02079460101");
  });
});

describe("phonePlaceholder", () => {
  it("has a local example number for every launch country", () => {
    expect(phonePlaceholder("fr")).toBe("06 12 34 56 78");
    expect(phonePlaceholder("gb")).toBe("020 7946 0101");
    for (const country of LAUNCH_COUNTRIES) {
      expect(phonePlaceholder(country.iso2).length).toBeGreaterThan(6);
    }
  });
});
