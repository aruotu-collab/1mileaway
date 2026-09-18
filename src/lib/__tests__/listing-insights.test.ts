import { describe, expect, it } from "vitest";
import { callCountCopy, joinWithAnd, unclaimedDemandCopy } from "@/lib/listing-insights";

describe("joinWithAnd", () => {
  it("reads naturally for one, two and many items", () => {
    expect(joinWithAnd(["Plumbers"])).toBe("Plumbers");
    expect(joinWithAnd(["Plumbers", "Heating engineers"])).toBe("Plumbers and Heating engineers");
    expect(joinWithAnd(["Plumbers", "Electricians", "Locksmiths"])).toBe(
      "Plumbers, Electricians and Locksmiths",
    );
  });
});

describe("unclaimedDemandCopy", () => {
  it("explains that Call now is off when nobody has asked yet", () => {
    expect(
      unclaimedDemandCopy({
        asks: 0,
        asksLast30: 0,
        trades: ["Plumbers"],
        areas: ["Catford"],
      }),
    ).toBe(
      "This listing already appears when people search Plumbers in Catford. Customers cannot tap Call now until it is claimed.",
    );
  });

  it("counts real customer asks without inventing calls", () => {
    expect(
      unclaimedDemandCopy({
        asks: 3,
        asksLast30: 3,
        trades: ["Plumbers", "Heating engineers"],
        areas: ["Catford"],
      }),
    ).toContain("3 customers have asked for this business on 1mileaway.");
  });
});

describe("callCountCopy", () => {
  it("is honest that duration is unknown", () => {
    expect(
      callCountCopy({ totalCalls: 4, callsLast7: 1, callsLast30: 3, lastCallAt: new Date("2026-09-01") }),
    ).toContain("We cannot see whether the phone was answered");
    expect(callCountCopy({ totalCalls: 0, callsLast7: 0, callsLast30: 0, lastCallAt: null })).toContain(
      "No customer has tapped Call now",
    );
  });
});
