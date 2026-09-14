import { prisma } from "@/lib/db";
import { APP_URL, PAYMENT_STATES } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/adapter";
import { formatMoney } from "@/lib/utils";
import { setAvailability } from "@/lib/availability/engine";
import { AVAILABILITY } from "@/lib/constants";

export async function createCheckoutForLead(leadId: string) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: { business: { include: { users: { include: { profile: true } } } }, outstanding: true },
  });
  if (!lead || !lead.outstanding || lead.outstanding.status !== "OPEN") {
    throw new Error("No open balance for this lead");
  }

  const payment = await prisma.payment.create({
    data: {
      businessId: lead.businessId,
      leadId: lead.id,
      provider: process.env.STRIPE_SECRET_KEY ? "stripe" : "mock",
      amountMinor: lead.outstanding.amountMinor,
      currency: lead.outstanding.currency,
      status: "pending",
    },
  });

  if (!process.env.STRIPE_SECRET_KEY) {
    const url = `${APP_URL}/pay/mock/${payment.id}`;
    return { url, paymentId: payment.id, mocked: true };
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "payment",
      success_url: `${APP_URL}/professional/payments?settled=1`,
      cancel_url: `${APP_URL}/professional/payments?cancelled=1`,
      "line_items[0][price_data][currency]": lead.outstanding.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(lead.outstanding.amountMinor),
      "line_items[0][price_data][product_data][name]": "1mileaway qualified lead",
      "line_items[0][quantity]": "1",
      "metadata[paymentId]": payment.id,
      "metadata[leadId]": lead.id,
    }),
  });
  const body = (await res.json()) as { id?: string; url?: string; error?: { message: string } };
  if (!res.ok || !body.url) {
    throw new Error(body.error?.message ?? "Stripe checkout failed");
  }
  await prisma.payment.update({
    where: { id: payment.id },
    data: { providerRef: body.id },
  });
  return { url: body.url, paymentId: payment.id, mocked: false };
}

export async function settlePayment(paymentId: string, providerRef?: string) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { lead: true, business: { include: { users: { include: { profile: true } } } } },
    });
    if (!payment) throw new Error("Payment not found");
    if (payment.status === "settled") return payment;

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "settled",
        settledAt: new Date(),
        providerRef: providerRef ?? payment.providerRef,
      },
    });
    await tx.paymentEvent.create({
      data: { paymentId: payment.id, type: "settled" },
    });
    await tx.outstandingLeadBalance.updateMany({
      where: { leadId: payment.leadId, status: "OPEN" },
      data: { status: "SETTLED", settledAt: new Date() },
    });
    await tx.lead.update({
      where: { id: payment.leadId },
      data: { status: "SETTLED" },
    });
    await tx.business.update({
      where: { id: payment.businessId },
      data: { paymentState: PAYMENT_STATES.PAID_ELIGIBLE },
    });
    return payment;
  }).then(async (payment) => {
    await writeAudit({
      action: "payment.settled",
      entityType: "payment",
      entityId: payment.id,
      metadata: { leadId: payment.leadId },
    });
    const owner = payment.business.users[0]?.profile;
    if (owner) {
      await sendEmail({
        to: owner.email,
        businessId: payment.businessId,
        template: "payment_settled",
        subject: "Lead settled — are you available now?",
        html: `<p>Thanks. ${formatMoney(payment.amountMinor, payment.currency)} is settled.</p>
          <p>Confirm whether you are available now from your dashboard.</p>`,
      });
    }
    await setAvailability({
      businessId: payment.businessId,
      status: AVAILABILITY.UNKNOWN,
      source: "payment_settled",
    });
    return payment;
  });
}
