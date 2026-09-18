import { describe, expect, it } from "vitest";
import { createHmac } from "crypto";
import { stripeEventAction, verifyStripeSignature } from "@/lib/payments/stripe";

function sign(payload: string, secret: string, timestamp: number) {
  const v1 = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

describe("verifyStripeSignature", () => {
  const secret = "whsec_test";
  const payload = `{"type":"checkout.session.completed"}`;

  it("accepts a fresh Stripe-Signature header", () => {
    const now = 1_700_000_000_000;
    expect(verifyStripeSignature(payload, sign(payload, secret, 1_700_000_000), secret, now)).toBe(true);
  });

  it("rejects a missing, old, or wrong signature", () => {
    const now = 1_700_000_000_000;
    expect(verifyStripeSignature(payload, null, secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, secret, 1_699_000_000), secret, now)).toBe(false);
    expect(verifyStripeSignature(payload, sign(payload, "other", 1_700_000_000), secret, now)).toBe(false);
  });
});

describe("stripeEventAction", () => {
  it("activates from checkout completion", () => {
    expect(
      stripeEventAction({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_123",
            customer: "cus_123",
            subscription: "sub_123",
            metadata: { paymentId: "pay_1", businessId: "biz_1", kind: "subscription" },
          },
        },
      }),
    ).toEqual({
      type: "activate",
      paymentId: "pay_1",
      sessionId: "cs_123",
      subscriptionId: "sub_123",
      customerId: "cus_123",
      trialing: false,
    });
  });

  it("keeps a $0 checkout as a trial card on file", () => {
    expect(
      stripeEventAction({
        type: "checkout.session.completed",
        data: {
          object: {
            id: "cs_trial",
            payment_status: "no_payment_required",
            amount_total: 0,
            metadata: { paymentId: "pay_2" },
            subscription: "sub_2",
            customer: "cus_2",
          },
        },
      }).trialing,
    ).toBe(true);
  });

  it("renews, marks past due, and cancels from later Stripe events", () => {
    expect(
      stripeEventAction({
        type: "invoice.paid",
        data: {
          object: {
            amount_paid: 2900,
            billing_reason: "subscription_cycle",
            subscription: "sub_123",
            lines: { data: [{ period: { end: 1_800_000_000 } }] },
          },
        },
      }),
    ).toEqual({
      type: "renew",
      businessId: undefined,
      subscriptionId: "sub_123",
      periodEnd: new Date(1_800_000_000_000),
    });
    expect(
      stripeEventAction({
        type: "invoice.paid",
        data: { object: { amount_paid: 0, billing_reason: "subscription_create", subscription: "sub_123" } },
      }),
    ).toEqual({ type: "ignore" });
    expect(
      stripeEventAction({
        type: "customer.subscription.updated",
        data: { object: { id: "sub_123", object: "subscription", status: "past_due", metadata: { businessId: "biz_1" } } },
      }),
    ).toEqual({ type: "past_due", businessId: "biz_1", subscriptionId: "sub_123" });
    expect(
      stripeEventAction({
        type: "customer.subscription.deleted",
        data: { object: { id: "sub_123", object: "subscription", metadata: { businessId: "biz_1" } } },
      }),
    ).toEqual({ type: "cancel", businessId: "biz_1", subscriptionId: "sub_123" });
  });
});
