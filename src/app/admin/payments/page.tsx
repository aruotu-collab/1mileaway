import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { PAYMENT_STATES } from "@/lib/constants";
import { formatMoney, formatLocalDateTime } from "@/lib/utils";
import { daysRemaining, isSubscriptionActive, isTrialing, subscriptionPriceLabel } from "@/lib/subscription";

export default async function AdminPaymentsPage() {
  const [businesses, payments] = await Promise.all([
    prisma.business.findMany({
      where: {
        deletedAt: null,
        paymentState: {
          in: [
            PAYMENT_STATES.SUBSCRIPTION_TRIALING,
            PAYMENT_STATES.SUBSCRIPTION_ACTIVE,
            PAYMENT_STATES.SUBSCRIPTION_PAST_DUE,
          ],
        },
      },
      include: { subscription: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.payment.findMany({
      include: { business: true },
      orderBy: { createdAt: "desc" },
      take: 40,
    }),
  ]);
  const paying = businesses.filter((biz) =>
    isSubscriptionActive(biz.paymentState, biz.subscription?.currentPeriodEnd) &&
    !isTrialing(biz.paymentState, biz.subscription?.currentPeriodEnd),
  );
  const trialing = businesses.filter((biz) => isTrialing(biz.paymentState, biz.subscription?.currentPeriodEnd));
  const pastDue = businesses.filter((biz) => biz.paymentState === PAYMENT_STATES.SUBSCRIPTION_PAST_DUE);

  return (
    <main>
      <h1 className="serif text-4xl">Subscriptions</h1>
      <p className="mt-2 text-ink-soft">
        Monthly listing fee after the trial. There is no prepaid professional wallet and no per-lead bill. Price is{" "}
        {subscriptionPriceLabel()}.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <AdminStat label="Paying" value={paying.length} />
        <AdminStat label="On trial" value={trialing.length} />
        <AdminStat label="Past due" value={pastDue.length} />
      </div>

      {businesses.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No trials or subscriptions yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {businesses.map((biz) => {
            const periodEnd = biz.subscription?.currentPeriodEnd;
            const trial = isTrialing(biz.paymentState, periodEnd);
            const days = daysRemaining(periodEnd);
            return (
              <li key={biz.id} className="card p-4 text-sm">
                <p className="font-semibold">
                  <Link href={`/gb/p/${biz.slug}`} className="hover:underline">
                    {biz.name}
                  </Link>
                </p>
                <p className="mt-1 text-ink-soft">
                  {trial ? "Two-month trial" : biz.paymentState.replaceAll("_", " ").toLowerCase()}
                  {biz.subscription
                    ? ` · ${formatMoney(biz.subscription.amountMinor, biz.subscription.currency)}`
                    : ""}
                  {periodEnd ? ` · ends ${formatLocalDateTime(periodEnd)}` : ""}
                  {days != null ? ` · ${days} days left` : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="serif mt-10 text-2xl">Payments</h2>
      {payments.length === 0 ? (
        <p className="card mt-4 p-5 text-ink-soft">No subscription payments recorded yet.</p>
      ) : (
        <ul className="mt-4 grid gap-2">
          {payments.map((row) => (
            <li key={row.id} className="card p-4 text-sm">
              <p className="font-semibold">{row.business.name}</p>
              <p className="mt-1 text-ink-soft">
                {row.kind} · {row.status} · {row.provider} · {formatMoney(row.amountMinor, row.currency)} ·{" "}
                {formatLocalDateTime(row.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
