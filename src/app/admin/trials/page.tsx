import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { PAYMENT_STATES } from "@/lib/constants";
import { daysRemaining, isTrialing, TRIAL_MONTHS } from "@/lib/subscription";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminTrialsPage() {
  const businesses = await prisma.business.findMany({
    where: {
      deletedAt: null,
      OR: [
        { paymentState: PAYMENT_STATES.SUBSCRIPTION_TRIALING },
        { paymentState: PAYMENT_STATES.FREE_TRIAL_ACTIVE },
        { subscription: { status: "trialing" } },
      ],
    },
    include: { subscription: true, _count: { select: { calls: true } } },
    orderBy: { updatedAt: "desc" },
  });
  const live = businesses.filter((biz) => isTrialing(biz.paymentState, biz.subscription?.currentPeriodEnd));
  const endingSoon = live.filter((biz) => {
    const days = daysRemaining(biz.subscription?.currentPeriodEnd);
    return days != null && days <= 14;
  });

  return (
    <main>
      <h1 className="serif text-4xl">Trials</h1>
      <p className="mt-2 text-ink-soft">
        Claimed listings get {TRIAL_MONTHS} months free with Call now on their own number. After that they pay monthly or
        Call now turns off. This is not a wallet of free leads.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <AdminStat label="Live two-month trials" value={live.length} />
        <AdminStat label="Ending in 14 days" value={endingSoon.length} />
      </div>
      {businesses.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No trials have been started yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {businesses.map((biz) => {
            const days = daysRemaining(biz.subscription?.currentPeriodEnd);
            const liveTrial = isTrialing(biz.paymentState, biz.subscription?.currentPeriodEnd);
            return (
              <li key={biz.id} className="card p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-semibold">
                    <Link href={`/gb/p/${biz.slug}`} className="hover:underline">
                      {biz.name}
                    </Link>
                  </p>
                  <p className="text-sm text-ink-soft">
                    {liveTrial
                      ? days != null
                        ? `${days} days left`
                        : "trial live"
                      : "trial ended"}
                  </p>
                </div>
                <p className="mt-1 text-sm text-ink-soft">
                  {biz._count.calls} Call now taps
                  {biz.subscription?.currentPeriodEnd
                    ? ` · period ends ${formatLocalDateTime(biz.subscription.currentPeriodEnd)}`
                    : ""}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
