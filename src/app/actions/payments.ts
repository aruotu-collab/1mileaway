"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { activateSubscription, createSubscriptionCheckout, settlePayment } from "@/lib/payments/adapter";

export async function startSubscription() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/payments");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/professional");
  const checkout = await createSubscriptionCheckout(link.businessId);
  redirect(checkout.url);
}

export async function settleMockPayment(paymentId: string) {
  if (process.env.STRIPE_SECRET_KEY) {
    redirect("/professional/payments");
  }
  await settlePayment(paymentId, `mock_${paymentId}`);
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (payment?.kind === "subscription") {
    redirect("/professional/payments?subscribed=1");
  }
  redirect("/professional/payments?settled=1");
}

export async function activateMockSubscription() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/payments");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/professional");
  if (process.env.STRIPE_SECRET_KEY) redirect("/professional/payments");
  const checkout = await createSubscriptionCheckout(link.businessId);
  await activateSubscription(checkout.paymentId, `mock_${checkout.paymentId}`);
  redirect("/professional/payments?subscribed=1");
}
