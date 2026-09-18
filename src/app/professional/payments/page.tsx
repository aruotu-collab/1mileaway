import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { startSubscription } from "@/app/actions/payments";
import { formatMoney, formatLocalDateTime } from "@/lib/utils";
import {
  daysRemaining,
  expireEndedTrials,
  hasStripeBilling,
  isSubscriptionActive,
  isTrialing,
  marketplaceStats,
  subscriptionPriceLabel,
} from "@/lib/subscription";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ settled?: string; subscribed?: string; cancelled?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/payments");
  const query = await searchParams;
  await expireEndedTrials();
  const link = await prisma.businessUser.findFirst({
    where: { profileId: user.id },
    include: {
      business: {
        include: {
          subscription: true,
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!link) redirect("/professional");
  const periodEnd = link.business.subscription?.currentPeriodEnd ?? null;
  const subscribed = isSubscriptionActive(link.business.paymentState, periodEnd);
  const trial = isTrialing(link.business.paymentState, periodEnd);
  const cardSaved = hasStripeBilling(link.business.subscription?.provider, link.business.subscription?.providerSubscriptionId);
  const stats = await marketplaceStats(link.businessId);
  const daysLeft = daysRemaining(periodEnd);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="serif text-4xl">Subscription</h1>
      {query.subscribed ? (
        <p className="card mt-4 p-4">
          {trial
            ? `Your card is saved. You will not be charged until ${periodEnd ? formatLocalDateTime(periodEnd) : "the trial ends"}.`
            : "Your monthly listing is active. Customers can now call you from 1mileaway."}
        </p>
      ) : null}
      {query.cancelled ? <p className="card mt-4 p-4">Checkout was cancelled. You can start again whenever you are ready.</p> : null}

      <section className="mt-6 grid gap-3 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-sm text-ink-soft">Calls through the app</p>
          <p className="serif mt-1 text-3xl">{stats.totalCalls}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-soft">Last 30 days</p>
          <p className="serif mt-1 text-3xl">{stats.callsLast30}</p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-soft">Asked, not connected</p>
          <p className="serif mt-1 text-3xl">{stats.asks}</p>
        </div>
      </section>

      <section className="card mt-6 p-5">
        {trial ? (
          <>
            <p className="serif text-2xl">Two-month free trial</p>
            <p className="mt-2 text-ink-soft">
              Call now is on until {periodEnd ? formatLocalDateTime(periodEnd) : "your trial ends"}
              {daysLeft != null ? ` (${daysLeft} days left)` : ""}. No card is needed for the trial. 1mileaway has sent
              you {stats.totalCalls} calls so far.
            </p>
            {cardSaved ? (
              <p className="mt-4 text-ink-soft">
                Your card is already on file. The first {subscriptionPriceLabel()} charge is when the trial ends.
              </p>
            ) : (
              <>
                <p className="mt-2 text-ink-soft">
                  When you are ready, subscribe. That is the only time we take a card, and we do not charge until the
                  trial ends.
                </p>
                <form action={startSubscription} className="mt-4">
                  <button className="btn btn-primary" type="submit">
                    Subscribe after trial for {subscriptionPriceLabel()}
                  </button>
                </form>
              </>
            )}
          </>
        ) : subscribed ? (
          <>
            <p className="serif text-2xl">Active</p>
            <p className="mt-2 text-ink-soft">
              You pay {subscriptionPriceLabel()} to appear with Call now. Customers ring your own number.
              {periodEnd ? ` Current period ends ${formatLocalDateTime(periodEnd)}.` : ""}
            </p>
          </>
        ) : (
          <>
            <p className="serif text-2xl">Keep the calls coming</p>
            <p className="mt-2 text-ink-soft">
              During your trial 1mileaway sent you {stats.totalCalls} calls. Subscribe for {subscriptionPriceLabel()} to
              turn Call now back on. No per-lead bill.
            </p>
            <form action={startSubscription} className="mt-4">
              <button className="btn btn-primary" type="submit">
                Subscribe
              </button>
            </form>
          </>
        )}
      </section>

      <ul className="mt-8 grid gap-2">
        {link.business.payments.map((payment) => (
          <li key={payment.id} className="card p-4 text-sm">
            {payment.kind} · {payment.status} · {formatMoney(payment.amountMinor, payment.currency)}
          </li>
        ))}
      </ul>
    </main>
  );
}
