import { prisma } from "@/lib/db";
import { APP_URL, PAYMENT_STATES } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/adapter";
import { formatMoney } from "@/lib/utils";
import {
  SUBSCRIPTION_AMOUNT_MINOR,
  SUBSCRIPTION_CURRENCY,
  isTrialing,
  stripeTrialEndUnix,
} from "@/lib/subscription";
import { getLaunchCountry, stripeCheckoutLocale } from "@/lib/countries/catalog";

function periodEndFromNow() {
  const end = new Date();
  end.setMonth(end.getMonth() + 1);
  return end;
}

export async function createSubscriptionCheckout(businessId: string) {
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: { country: true, users: { include: { profile: true } }, subscription: true },
  });
  const currency = SUBSCRIPTION_CURRENCY;
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

  const priceId = process.env.STRIPE_PRICE_ID;
  const email = business.users[0]?.profile?.email;
  const checkout = new URLSearchParams({
    mode: "subscription",
    success_url: `${APP_URL}/professional/payments?subscribed=1`,
    cancel_url: `${APP_URL}/professional/payments?cancelled=1`,
    locale: stripeCheckoutLocale(getLaunchCountry(business.country.iso2).language),
    client_reference_id: payment.id,
    "line_items[0][quantity]": "1",
    "metadata[paymentId]": payment.id,
    "metadata[businessId]": businessId,
    "metadata[kind]": "subscription",
    "subscription_data[metadata][paymentId]": payment.id,
    "subscription_data[metadata][businessId]": businessId,
    "subscription_data[metadata][kind]": "subscription",
  });
  if (email) checkout.set("customer_email", email);
  const trialEnd = isTrialing(business.paymentState, business.subscription?.currentPeriodEnd)
    ? stripeTrialEndUnix(business.subscription?.currentPeriodEnd)
    : null;
  if (trialEnd) {
    checkout.set("subscription_data[trial_end]", String(trialEnd));
    checkout.set("payment_method_collection", "always");
  }
  if (priceId) {
    checkout.set("line_items[0][price]", priceId);
  } else {
    checkout.set("line_items[0][price_data][currency]", currency.toLowerCase());
    checkout.set("line_items[0][price_data][unit_amount]", String(amountMinor));
    checkout.set("line_items[0][price_data][product_data][name]", "1mileaway monthly listing");
    checkout.set("line_items[0][price_data][recurring][interval]", "month");
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: checkout,
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

export async function activateSubscription(
  paymentId: string,
  providerRef?: string,
  extras?: { subscriptionId?: string; customerId?: string; periodEnd?: Date; trialing?: boolean },
) {
  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      business: {
        include: { users: { include: { profile: true } }, subscription: true },
      },
    },
  });
  if (!payment) throw new Error("Payment not found");
  if (payment.kind === "subscription" && (payment.status === "settled" || payment.status === "card_on_file")) {
    return payment;
  }

  const currentPeriodEnd =
    extras?.periodEnd ?? payment.business.subscription?.currentPeriodEnd ?? periodEndFromNow();
  const subscriptionId = extras?.subscriptionId ?? providerRef ?? payment.providerRef;
  const trialing = Boolean(extras?.trialing);
  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: trialing ? "card_on_file" : "settled",
        settledAt: trialing ? null : new Date(),
        providerRef: providerRef ?? payment.providerRef,
      },
    }),
    prisma.paymentEvent.create({
      data: { paymentId: payment.id, type: trialing ? "card_on_file" : "subscription_activated" },
    }),
    prisma.subscription.upsert({
      where: { businessId: payment.businessId },
      create: {
        businessId: payment.businessId,
        status: trialing ? "trialing" : "active",
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        currentPeriodEnd,
        provider: payment.provider,
        providerCustomerId: extras?.customerId,
        providerSubscriptionId: subscriptionId,
      },
      update: {
        status: trialing ? "trialing" : "active",
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        currentPeriodEnd,
        provider: payment.provider,
        providerCustomerId: extras?.customerId,
        providerSubscriptionId: subscriptionId,
      },
    }),
    prisma.business.update({
      where: { id: payment.businessId },
      data: {
        paymentState: trialing ? PAYMENT_STATES.SUBSCRIPTION_TRIALING : PAYMENT_STATES.SUBSCRIPTION_ACTIVE,
      },
    }),
  ]);

  await writeAudit({
    action: trialing ? "subscription.card_saved" : "subscription.activated",
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
      subject: trialing
        ? "Your card is saved — you will not be charged until the trial ends"
        : "Your 1mileaway listing is live",
      html: trialing
        ? `<p>Your card is on file. The two-month trial keeps going until ${currentPeriodEnd.toDateString()}. Then ${formatMoney(payment.amountMinor, payment.currency)} a month starts automatically.</p>
        <p><a href="${APP_URL}/professional">Open your dashboard</a></p>`
        : `<p>Thanks. Your monthly listing (${formatMoney(payment.amountMinor, payment.currency)}) is active.</p>
        <p>Customers can now tap Call now and ring you directly. Each call is emailed to you and logged in your account.</p>
        <p><a href="${APP_URL}/professional">Open your dashboard</a></p>`,
    });
  }
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
}

async function findSubscription(businessId?: string, subscriptionId?: string) {
  if (businessId) {
    return prisma.subscription.findUnique({ where: { businessId } });
  }
  if (subscriptionId) {
    return prisma.subscription.findFirst({ where: { providerSubscriptionId: subscriptionId } });
  }
  return null;
}

export async function renewSubscription(input: { businessId?: string; subscriptionId?: string; periodEnd?: Date }) {
  const row = await findSubscription(input.businessId, input.subscriptionId);
  if (!row) return null;
  const currentPeriodEnd = input.periodEnd ?? periodEndFromNow();
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: row.id },
      data: {
        status: "active",
        currentPeriodEnd,
        providerSubscriptionId: input.subscriptionId ?? row.providerSubscriptionId,
      },
    }),
    prisma.business.update({
      where: { id: row.businessId },
      data: { paymentState: PAYMENT_STATES.SUBSCRIPTION_ACTIVE },
    }),
  ]);
  return row;
}

export async function markSubscriptionPastDue(input: { businessId?: string; subscriptionId?: string }) {
  const row = await findSubscription(input.businessId, input.subscriptionId);
  if (!row) return null;
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: row.id },
      data: { status: "past_due" },
    }),
    prisma.business.update({
      where: { id: row.businessId },
      data: { paymentState: PAYMENT_STATES.SUBSCRIPTION_PAST_DUE },
    }),
  ]);
  return row;
}

export async function deactivateSubscription(businessId?: string, subscriptionId?: string) {
  const row = await findSubscription(businessId, subscriptionId);
  if (!row) return;
  await prisma.$transaction([
    prisma.subscription.update({
      where: { id: row.id },
      data: { status: "cancelled", currentPeriodEnd: new Date() },
    }),
    prisma.business.update({
      where: { id: row.businessId },
      data: { paymentState: PAYMENT_STATES.UNSUBSCRIBED },
    }),
  ]);
  await writeAudit({
    action: "subscription.cancelled",
    entityType: "business",
    entityId: row.businessId,
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
