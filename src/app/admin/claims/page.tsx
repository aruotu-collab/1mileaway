import Link from "next/link";
import { AdminStat } from "@/components/admin-stat";
import { claimConversions } from "@/lib/admin/conversions";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminClaimsPage() {
  const data = await claimConversions();
  const peak = Math.max(1, ...data.series.map((day) => day.count));
  const byDay = new Map<string, typeof data.conversions>();
  for (const row of data.conversions) {
    const list = byDay.get(row.dayKey) ?? [];
    list.push(row);
    byDay.set(row.dayKey, list);
  }

  return (
    <main>
      <h1 className="serif text-4xl">Claims</h1>
      <p className="mt-2 text-ink-soft">
        Listings that moved from <strong>not claimed</strong> to <strong>claimed</strong>. Days are London time. Seeded
        or imported listings that were already claimed are not counted here.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat label="Claimed today" value={data.todayCount} hint="Unclaimed → claimed since midnight" />
        <AdminStat label="Claimed this week" value={data.weekCount} hint="Last 7 days" />
        <AdminStat label="All conversions" value={data.allCount} hint={`${data.askedThenClaimed} were asked first`} />
        <AdminStat label="Still unclaimed" value={data.unclaimedCount} hint="The remaining pool" />
      </div>

      <h2 className="serif mt-10 text-2xl">Last 14 days</h2>
      <p className="mt-2 text-sm text-ink-soft">Quiet days stay on the list so you can see the pace.</p>
      <ol className="mt-4 grid gap-2">
        {data.series.map((day) => (
          <li key={day.key} className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-semibold">{day.label}</p>
              <p className="text-sm text-ink-soft">
                {day.count} {day.count === 1 ? "listing claimed" : "listings claimed"}
              </p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-paper">
              <div
                className="h-full rounded-full bg-moss-deep"
                style={{ width: `${Math.max(day.count ? 8 : 0, (day.count / peak) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>

      <h2 className="serif mt-10 text-2xl">Who converted</h2>
      {data.conversions.length === 0 ? (
        <p className="card mt-4 p-5 text-ink-soft">Nobody has claimed an unclaimed listing yet.</p>
      ) : (
        <div className="mt-4 grid gap-6">
          {data.series
            .filter((day) => (byDay.get(day.key)?.length ?? 0) > 0)
            .map((day) => (
              <section key={day.key}>
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-soft">{day.label}</h3>
                <ul className="mt-2 grid gap-3">
                  {(byDay.get(day.key) ?? []).map((row) => (
                    <li key={`${row.businessId}-${row.at.toISOString()}`} className="card p-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold">
                          <Link href={`/${row.country}/p/${row.slug}`} className="hover:underline">
                            {row.name}
                          </Link>
                        </p>
                        <p className="text-sm text-ink-soft">{formatLocalDateTime(row.at)}</p>
                      </div>
                      <p className="mt-1 text-sm text-ink-soft">
                        Unclaimed → claimed · {row.trade} · {row.area}
                        {row.askedBefore > 0
                          ? ` · asked ${row.askedBefore} ${row.askedBefore === 1 ? "time" : "times"} first`
                          : " · claimed without an ask"}
                        {row.email ? ` · ${row.email}` : ""}
                        {row.actorEmail && row.actorEmail !== row.email ? ` · signed in as ${row.actorEmail}` : ""}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      )}
    </main>
  );
}
