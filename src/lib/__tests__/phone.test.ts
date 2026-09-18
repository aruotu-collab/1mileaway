import { describe, expect, it } from "vitest";
import { canRequestTradesman, publicCallPhone, toTelHref } from "@/lib/phone";

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
  });
});
