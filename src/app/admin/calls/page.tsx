import Link from "next/link";
import { AdminStat } from "@/components/admin-stat";
import { callStatusLabel } from "@/lib/admin/insights";
import { customerTaps, type CallNowListing, type TappedListing } from "@/lib/admin/taps";
import { formatLocalDateTime } from "@/lib/utils";

function ListingRow({
  row,
  lastLabel,
  extra,
}: {
  row: TappedListing | CallNowListing;
  lastLabel: string;
  extra?: string;
}) {
  return (
    <li className="card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold">
          <Link href={`/${row.country}/p/${row.slug}`} className="hover:underline">
            {row.name}
          </Link>
        </p>
        <p className="text-sm text-ink-soft">
          {lastLabel} {formatLocalDateTime(row.lastAt)}
        </p>
      </div>
      <p className="mt-1 text-sm text-ink-soft">
        Clicked {row.tapCount} {row.tapCount === 1 ? "time" : "times"} · {row.trade} · {row.area}
        {extra ? ` · ${extra}` : ""}
        {row.email ? ` · ${row.email}` : ""}
      </p>
    </li>
  );
}

export default async function AdminCallsPage() {
  const data = await customerTaps();

  return (
    <main>
      <h1 className="serif text-4xl">Taps</h1>
      <p className="mt-2 text-ink-soft">
        Listings customers actually tapped. Unclaimed listings are <strong>Ask them to take this job</strong>. Call now
        listings are <strong>Call now</strong>. These are button taps, not page views.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat
          label="Unclaimed listings clicked"
          value={data.unclaimedListings.length}
          hint={`${data.askTapsToday} ask taps today`}
        />
        <AdminStat label="Ask taps" value={data.askTaps} hint="Every Ask them to take this job" />
        <AdminStat
          label="Call now listings clicked"
          value={data.callNowListings.length}
          hint={`${data.callTapsToday} Call now taps today`}
        />
        <AdminStat label="Call now taps" value={data.callTaps} hint="Every Call now button" />
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section id="unclaimed">
          <h2 className="serif text-2xl">Unclaimed listings people clicked</h2>
          <p className="mt-2 text-sm text-ink-soft">Still unclaimed, and a customer asked them to take the job.</p>
          {data.unclaimedListings.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">Nobody has asked an unclaimed listing yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {data.unclaimedListings.map((row) => (
                <ListingRow key={row.businessId} row={row} lastLabel="Last asked" />
              ))}
            </ul>
          )}
        </section>

        <section id="call-now">
          <h2 className="serif text-2xl">Call now listings people clicked</h2>
          <p className="mt-2 text-sm text-ink-soft">Listings where a customer tapped Call now on their own phone.</p>
          {data.callNowListings.length === 0 ? (
            <p className="card mt-4 p-5 text-ink-soft">Nobody has tapped Call now yet.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {data.callNowListings.map((row) => (
                <ListingRow
                  key={row.businessId}
                  row={row}
                  lastLabel="Last Call now"
                  extra={`${row.answered} answered · ${row.noAnswer} no answer${row.waiting ? ` · ${row.waiting} not reported` : ""}`}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      <h2 className="serif mt-10 text-2xl">Every Call now tap</h2>
      <p className="mt-2 text-sm text-ink-soft">
        We cannot hear the call or know how long it lasted. Answered / no answer is only what the customer reported
        afterwards.
      </p>
      {data.calls.length === 0 ? (
        <p className="card mt-4 p-5 text-ink-soft">No Call now taps yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {data.calls.map((call) => (
            <li key={call.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/${call.business.country.iso2}/p/${call.business.slug}`} className="hover:underline">
                    {call.business.name}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">{formatLocalDateTime(call.startedAt)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {callStatusLabel(call.status)} · {call.toNumber ?? "no number"} ·{" "}
                {call.lead?.location?.name ?? "no area"}
                {call.review ? ` · review ${call.review.rating}/5` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
