import { NextRequest, NextResponse } from "next/server";
import {
  activateSubscription,
  deactivateSubscription,
  markSubscriptionPastDue,
  renewSubscription,
} from "@/lib/payments/adapter";
import { stripeEventAction, verifyStripeSignature } from "@/lib/payments/stripe";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  if (secret) {
    const valid = verifyStripeSignature(body, request.headers.get("stripe-signature"), secret);
    if (!valid) return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  const payload = JSON.parse(body || "{}") as Parameters<typeof stripeEventAction>[0];
  const action = stripeEventAction(payload);

  if (action.type === "activate") {
    await activateSubscription(action.paymentId, action.sessionId, {
      subscriptionId: action.subscriptionId,
      customerId: action.customerId,
      trialing: action.trialing,
    });
  } else if (action.type === "renew") {
    await renewSubscription(action);
  } else if (action.type === "past_due") {
    await markSubscriptionPastDue(action);
  } else if (action.type === "cancel") {
    await deactivateSubscription(action.businessId, action.subscriptionId);
  }

  return NextResponse.json({ received: true });
}
