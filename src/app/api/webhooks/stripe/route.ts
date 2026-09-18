import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { activateSubscription, deactivateSubscription, settlePayment } from "@/lib/payments/adapter";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  if (secret) {
    const sig = request.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const payload = JSON.parse(body || "{}") as {
    type?: string;
    data?: {
      object?: {
        metadata?: { paymentId?: string; businessId?: string; kind?: string };
        id?: string;
        client_reference_id?: string;
      };
    };
  };
  const object = payload.data?.object;
  const paymentId = object?.metadata?.paymentId;
  const providerRef = object?.id;

  if (payload.type === "checkout.session.completed") {
    if (object?.metadata?.kind === "subscription" && paymentId) {
      await activateSubscription(paymentId, providerRef);
    } else if (paymentId) {
      await settlePayment(paymentId, providerRef);
    } else if (providerRef) {
      const payment = await prisma.payment.findUnique({ where: { providerRef } });
      if (payment) await settlePayment(payment.id, providerRef);
    }
  }

  if (payload.type === "customer.subscription.deleted" && object?.metadata?.businessId) {
    await deactivateSubscription(object.metadata.businessId);
  }

  return NextResponse.json({ received: true });
}
