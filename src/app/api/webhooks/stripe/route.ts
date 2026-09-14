import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { settlePayment } from "@/lib/payments/adapter";

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const body = await request.text();
  if (secret) {
    const sig = request.headers.get("stripe-signature");
    if (!sig) return NextResponse.json({ error: "missing signature" }, { status: 400 });
  }

  const payload = JSON.parse(body || "{}") as {
    type?: string;
    data?: { object?: { metadata?: { paymentId?: string }; id?: string } };
  };
  if (payload.type === "checkout.session.completed") {
    const paymentId = payload.data?.object?.metadata?.paymentId;
    const providerRef = payload.data?.object?.id;
    if (paymentId) {
      await settlePayment(paymentId, providerRef);
    } else if (providerRef) {
      const payment = await prisma.payment.findUnique({ where: { providerRef } });
      if (payment) await settlePayment(payment.id, providerRef);
    }
  }
  return NextResponse.json({ received: true });
}
