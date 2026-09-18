import { describe, expect, it } from "vitest";
import { daysRemaining, isSubscriptionActive, isTrialing, trialEndFrom } from "@/lib/subscription";

describe("isSubscriptionActive", () => {
  it("treats paid and unexpired trials as callable", () => {
    expect(isSubscriptionActive("SUBSCRIPTION_ACTIVE")).toBe(true);
    expect(isSubscriptionActive("SUBSCRIPTION_TRIALING", new Date(Date.now() + 86400000))).toBe(true);
    expect(isSubscriptionActive("SUBSCRIPTION_TRIALING", new Date(Date.now() - 1000))).toBe(false);
    expect(isSubscriptionActive("UNSUBSCRIBED")).toBe(false);
  });
});

describe("isTrialing", () => {
  it("is only true during a live trial", () => {
    expect(isTrialing("SUBSCRIPTION_TRIALING", new Date(Date.now() + 86400000))).toBe(true);
    expect(isTrialing("SUBSCRIPTION_ACTIVE", new Date(Date.now() + 86400000))).toBe(false);
  });
});

describe("trialEndFrom", () => {
  it("adds two months", () => {
    const start = new Date(2026, 0, 15);
    const end = trialEndFrom(start);
    expect(end.getMonth()).toBe(2);
    expect(end.getDate()).toBe(15);
  });
});

describe("daysRemaining", () => {
  it("counts whole days left", () => {
    expect(daysRemaining(new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))).toBeGreaterThanOrEqual(3);
    expect(daysRemaining(new Date(Date.now() - 1000))).toBe(0);
  });
});
