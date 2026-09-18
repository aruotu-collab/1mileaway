import { prisma } from "@/lib/db";
import { APP_URL, PAYMENT_STATES } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/adapter";
import { formatMoney } from "@/lib/utils";
import { SUBSCRIPTION_AMOUNT_MINOR, SUBSCRIPTION_CURRENCY } from "@/lib/subscription";

function periodEndFromNow() {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return end;
}

export async function createSubscriptionCheckout(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: { country: true },
  });
  const currency = business.country.currency || SUBSCRIPTION_CURRENCY;
  const amountMinor = SUBSCRIPTION_AMOUNT_MINOR;

  const payment = await prisma.payment.create({
    data: {
      businessId,
      kind: "subscription",
      provider: process.env.STRIPE_SECRET_KEY ? "stripe" : "mock",
      amountMinor,
      currency,
      status: "pending",
    },
  });

  if (!process.env.STRIPE_SECRET_KEY) {
    return { url: `${APP_URL}/pay/mock/${payment.id}`, paymentId: payment.id, mocked: true };
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      mode: "subscription",
      success_url: `${APP_URL}/professional/payments?subscribed=1`,
      cancel_url: `${APP_URL}/professional/payments?cancelled=1`,
      "line_items[0][price_data][currency]": currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(amountMinor),
      "line_items[0][price_data][product_data][name]": "1mileaway monthly listing",
      "line_items[0][price_data][recurring][interval]": "month",
      "line_items[0][quantity]": "1",
      "metadata[paymentId]": payment.id,
      "metadata[businessId]": businessId,
      "metadata[kind]": "subscription",
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

export async function activateSubscription(paymentId: string, providerRef?: string) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: { business: { include: { users: { include: { profile: true } } } } },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.status === "settled" && payment.kind === "subscription") {
    return payment;
  }

  const currentPeriodEnd = periodEndFromNow();
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "settled",
        settledAt: new Date(),
        providerRef: providerRef ?? payment.providerRef,
      },
    }),
    prisma.paymentEvent.create({
      data: { paymentId: payment.id, type: "subscription_activated" },
    }),
    prisma.subscription.upsert({
      where: { businessId: payment.businessId },
      create: {
        businessId: payment.businessId,
        status: "active",
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        currentPeriodEnd,
        provider: payment.provider,
        providerSubscriptionId: providerRef ?? payment.providerRef,
      },
      update: {
        status: "active",
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        currentPeriodEnd,
        provider: payment.provider,
        providerSubscriptionId: providerRef ?? payment.providerRef,
      },
    }),
    prisma.business.update({
      where: { id: payment.businessId },
      data: { paymentState: PAYMENT_STATES.SUBSCRIPTION_ACTIVE },
    }),
  ]);

  await writeAudit({
    action: "subscription.activated",
    entityType: "business",
    entityId: payment.businessId,
    metadata: { paymentId: payment.id },
  });

  const owner = payment.business.users[0]?.profile;
  if (owner) {
    await sendEmail({
      to: owner.email,
      businessId: payment.businessId,
      template: "subscription_started",
      subject: "Your 1mileaway listing is live",
      html: `<p>Thanks. Your monthly listing (${formatMoney(payment.amountMinor, payment.currency)}) is active.</p>
        <p>Customers can now tap Call now and ring you directly. Each call is emailed to you and logged in your account.</p>
        <p><a href="${APP_URL}/professional">Open your dashboard</a></p>`,
    });
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

export async function deactivateSubscription(businessId: string) {
  await prisma.$transaction([
    prisma.subscription.updateMany({
      where: { businessId },
      data: { status: "cancelled", currentPeriodEnd: new Date() },
    }),
    prisma.business.update({
      where: { id: businessId },
      data: { paymentState: PAYMENT_STATES.UNSUBSCRIBED },
    }),
  ]);
  await writeAudit({
    action: "subscription.cancelled",
    entityType: "business",
    entityId: businessId,
  });
}

export async function settlePayment(paymentId: string, providerRef?: string) {
  const payment = await prisma.payment.findUnique({ where: { id: paymentId } });
  if (!payment) throw new Error("Payment not found");
  if (payment.kind === "subscription") {
    return activateSubscription(paymentId, providerRef);
  }

  return prisma.$transaction(async (tx) => {
    const row = await tx.payment.findUnique({
      where: { id: paymentId },
      include: { lead: true, business: { include: { users: { include: { profile: true } } } } },
    });
    if (!row) throw new Error("Payment not found");
    if (row.status === "settled") return row;

    await tx.payment.update({
      where: { id: row.id },
      data: {
        status: "settled",
        settledAt: new Date(),
        providerRef: providerRef ?? row.providerRef,
      },
    });
    await tx.paymentEvent.create({
      data: { paymentId: row.id, type: "settled" },
    });
    if (row.leadId) {
      await tx.outstandingLeadBalance.updateMany({
        where: { leadId: row.leadId, status: "OPEN" },
        data: { status: "SETTLED", settledAt: new Date() },
      });
      await tx.lead.update({
        where: { id: row.leadId },
        data: { status: "SETTLED" },
      });
    }
    await tx.business.update({
      where: { id: row.businessId },
      data: { paymentState: PAYMENT_STATES.SUBSCRIPTION_ACTIVE },
    });
    return row;
  }).then(async (row) => {
    await writeAudit({
      action: "payment.settled",
      entityType: "payment",
      entityId: row.id,
      metadata: { leadId: row.leadId },
    });
    return row;
  });
}
