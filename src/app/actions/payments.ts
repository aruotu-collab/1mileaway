"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { createCheckoutForLead, settlePayment } from "@/lib/payments/adapter";

export async function payOutstanding() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/payments");
  const link = await prisma.businessUser.findFirst({
    where: { profileId: user.id },
    include: { business: { include: { outstanding: { where: { status: "OPEN" }, include: { lead: true } } } } },
  });
  const open = link?.business.outstanding[0];
  if (!open) redirect("/professional/payments");
  const checkout = await createCheckoutForLead(open.leadId);
  redirect(checkout.url);
}

export async function settleMockPayment(paymentId: string) {
  if (process.env.STRIPE_SECRET_KEY) {
    redirect("/professional/payments");
  }
  await settlePayment(paymentId, `mock_${paymentId}`);
  redirect("/professional/payments?settled=1");
}
