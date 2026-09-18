import { createHmac, timingSafeEqual } from "crypto";

export function verifyStripeSignature(payload: string, header: string | null, secret: string, now = Date.now()) {
  if (!header) return false;
  const parts = Object.fromEntries(
    header.split(",").map((piece) => {
      const index = piece.indexOf("=");
      return [piece.slice(0, index), piece.slice(index + 1)];
    }),
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;
  const ageMs = Math.abs(now - Number(timestamp) * 1000);
  if (!Number.isFinite(ageMs) || ageMs > 5 * 60 * 1000) return false;
  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  const actual = Buffer.from(signature, "hex");
  const wanted = Buffer.from(expected, "hex");
  if (actual.length !== wanted.length) return false;
  return timingSafeEqual(actual, wanted);
}

type StripeObject = {
  id?: string;
  object?: string;
  customer?: string | { id?: string };
  subscription?: string | { id?: string };
  client_reference_id?: string;
  status?: string;
  current_period_end?: number;
  billing_reason?: string;
  payment_status?: string;
  amount_total?: number;
  amount_paid?: number;
  metadata?: { paymentId?: string; businessId?: string; kind?: string };
  lines?: { data?: Array<{ period?: { end?: number } }> };
};

export type StripeEventAction =
  | {
      type: "activate";
      paymentId: string;
      sessionId?: string;
      subscriptionId?: string;
      customerId?: string;
      trialing?: boolean;
    }
  | {
      type: "renew";
      businessId?: string;
      subscriptionId?: string;
      periodEnd?: Date;
    }
  | {
      type: "past_due";
      businessId?: string;
      subscriptionId?: string;
    }
  | {
      type: "cancel";
      businessId?: string;
      subscriptionId?: string;
    }
  | { type: "ignore" };

function idOf(value?: string | { id?: string }) {
  if (!value) return undefined;
  return typeof value === "string" ? value : value.id;
}

function periodFrom(object: StripeObject) {
  if (typeof object.current_period_end === "number") return new Date(object.current_period_end * 1000);
  const end = object.lines?.data?.[0]?.period?.end;
  if (typeof end === "number") return new Date(end * 1000);
  return undefined;
}

export function stripeEventAction(event: { type?: string; data?: { object?: StripeObject } }): StripeEventAction {
  const object = event.data?.object ?? {};
  const paymentId = object.metadata?.paymentId ?? object.client_reference_id;
  const businessId = object.metadata?.businessId;
  const subscriptionId = idOf(object.subscription) ?? (object.object === "subscription" ? object.id : undefined);
  const customerId = idOf(object.customer);

  if (event.type === "checkout.session.completed" && paymentId) {
    return {
      type: "activate",
      paymentId,
      sessionId: object.id,
      subscriptionId,
      customerId,
      trialing: object.payment_status === "no_payment_required" || object.amount_total === 0,
    };
  }

  if (event.type === "invoice.paid") {
    if (!object.amount_paid || object.billing_reason === "subscription_create") return { type: "ignore" };
    return { type: "renew", businessId, subscriptionId, periodEnd: periodFrom(object) };
  }

  if (event.type === "invoice.payment_failed" || (event.type === "customer.subscription.updated" && object.status === "past_due")) {
    return { type: "past_due", businessId, subscriptionId };
  }

  if (event.type === "customer.subscription.updated" && object.status === "active") {
    return { type: "renew", businessId, subscriptionId, periodEnd: periodFrom(object) };
  }

  if (event.type === "customer.subscription.updated" && object.status === "trialing") {
    return { type: "ignore" };
  }

  if (
    event.type === "customer.subscription.deleted" ||
    (event.type === "customer.subscription.updated" && (object.status === "canceled" || object.status === "unpaid"))
  ) {
    return { type: "cancel", businessId, subscriptionId };
  }

  return { type: "ignore" };
}
