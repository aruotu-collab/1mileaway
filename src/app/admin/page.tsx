import Link from "next/link";
import { AdminStat } from "@/components/admin-stat";
import { adminOverview } from "@/lib/admin/insights";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminOverviewPage() {
  const data = await adminOverview();
  const snap = data.marketplace;

  return (
    <main>
      <h1 className="serif text-4xl">Overview</h1>
      <p className="mt-2 text-ink-soft">
        Successful local connections are Call now taps through the web app. Nothing here is invented — no page views,
        call length, or live searcher counts.
      </p>

      <h2 className="serif mt-8 text-2xl">Right now</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Call now taps today"
          value={snap.callsToday}
          hint={snap.lastCallAt ? `Last ${formatLocalDateTime(snap.lastCallAt)}` : "None yet today"}
        />
        <AdminStat label="Call now taps all-time" value={snap.callsAllTime} />
        <AdminStat
          label="Unclaimed asks today"
          value={snap.unclaimedAsksToday}
          hint="Customers who asked them to take a job"
        />
        <AdminStat label="Listings with Call now on" value={snap.callNowOnCount} />
        <AdminStat
          label="Claimed today"
          value={data.claimsToday}
          hint="Unclaimed → claimed"
        />
        <AdminStat
          label="Claimed · not yet claimed"
          value={`${snap.claimedCount} · ${snap.unclaimedCount}`}
        />
        <AdminStat label="Two-month trials" value={snap.trialCount} />
        <AdminStat label="Paying subscriptions" value={data.subscribedCount} />
        <AdminStat label="Recently available" value={snap.availableNow} />
        <AdminStat
          label="Answer reports today"
          value={data.answeredToday}
          hint="Only when the customer told us they picked up"
        />
        <AdminStat label="No-answer reports today" value={data.noAnswerToday} />
        <AdminStat label="Reviews from real calls" value={snap.reviewCount} />
        <AdminStat label="Emails sent today" value={data.emailsToday} />
        <AdminStat
          label="Open contact messages"
          value={data.openContacts}
          hint="Reply from Contact"
        />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <section>
          <h2 className="serif text-2xl">What just happened</h2>
          {data.feed.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">No calls, asks, reviews, payments, emails or contact messages yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {data.feed.map((item, index) => (
                <li key={`${item.kind}-${item.at.toISOString()}-${index}`} className="card p-4">
                  <p className="text-xs uppercase tracking-[0.14em] text-ink-soft">
                    {item.kind} · {formatLocalDateTime(item.at)}
                  </p>
                  <p className="mt-1 font-semibold">{item.title}</p>
                  <p className="mt-1 text-sm text-ink-soft">{item.detail}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="serif text-2xl">Claimed vs unclaimed by trade</h2>
          <p className="mt-2 text-sm text-ink-soft">
            Same split customers see on the live tape. Unclaimed listings can still be asked to take a job.
          </p>
          {snap.trades.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">No listings yet.</p>
          ) : (
            <ul className="mt-4 grid gap-2">
              {snap.trades.map((trade) => (
                <li key={trade.plural} className="card flex items-baseline justify-between gap-3 p-4">
                  <p className="font-semibold">{trade.plural}</p>
                  <p className="text-sm text-ink-soft">
                    {trade.claimed} claimed · {trade.unclaimed} not yet
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-sm">
            <Link href="/admin/calls#unclaimed" className="text-moss-deep hover:underline">
              Unclaimed listings people clicked →
            </Link>
            <span className="text-ink-soft"> · </span>
            <Link href="/admin/calls#call-now" className="text-moss-deep hover:underline">
              Call now listings people clicked →
            </Link>
            <span className="text-ink-soft"> · </span>
            <Link href="/admin/claims" className="text-moss-deep hover:underline">
              See daily claim conversions →
            </Link>
            <span className="text-ink-soft"> · </span>
            <Link href="/admin/professionals" className="text-moss-deep hover:underline">
              Open professionals →
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
