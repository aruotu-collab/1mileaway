import Link from "next/link";
import { prisma } from "@/lib/db";
import { createUnclaimedListing, importListingsCsv } from "@/app/actions/admin";
import { claimLabel } from "@/lib/admin/insights";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { CLAIM_STATUS, PAYMENT_STATES } from "@/lib/constants";
import { listProfessionPicks } from "@/lib/listings/professions";
import { publicCallPhone } from "@/lib/phone";
import { daysRemaining, isSubscriptionActive, isTrialing } from "@/lib/subscription";

const filters = [
  { id: "all", label: "All" },
  { id: "unclaimed", label: "Unclaimed" },
  { id: "claimed", label: "Claimed" },
  { id: "trial", label: "On trial" },
  { id: "live", label: "Call now on" },
  { id: "asked", label: "Asked" },
] as const;

export default async function AdminProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    invited?: string;
    skipped?: string;
    invalid?: string;
    importError?: string;
    view?: string;
  }>;
}) {
  const imported = await searchParams;
  const view = filters.some((filter) => filter.id === imported.view) ? imported.view : "all";
  const askCounts = await prisma.lead.groupBy({
    by: ["businessId"],
    where: { callId: null },
    _count: { _all: true },
  });
  const asksByBusiness = new Map(askCounts.map((row) => [row.businessId, row._count._all]));
  const askedIds = askCounts.map((row) => row.businessId);
  const [professions, locations, businesses] = await Promise.all([
    listProfessionPicks(),
    prisma.location.findMany({
      where: { country: { iso2: "gb" }, type: "district", active: true },
      orderBy: { name: "asc" },
    }),
    prisma.business.findMany({
      where: {
        deletedAt: null,
        ...(view === "asked" ? { id: { in: askedIds } } : {}),
      },
      include: {
        availability: true,
        subscription: true,
        professions: { include: { profession: { include: { slugs: true } } } },
        locations: { include: { location: true } },
        _count: { select: { calls: true, reviews: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const rows = businesses
    .map((biz) => {
      const periodEnd = biz.subscription?.currentPeriodEnd ?? null;
      const callNowOn = Boolean(
        publicCallPhone({
          claimStatus: biz.claimStatus,
          paymentState: biz.paymentState,
          phoneReal: biz.phoneReal,
          currentPeriodEnd: periodEnd,
        }),
      );
      return {
        ...biz,
        callNowOn,
        trial: isTrialing(biz.paymentState, periodEnd),
        subscribed: isSubscriptionActive(biz.paymentState, periodEnd),
        daysLeft: daysRemaining(periodEnd),
        asks: asksByBusiness.get(biz.id) ?? 0,
        availability: isAvailabilityLive(biz.availability?.status ?? "UNKNOWN", biz.availability?.expiresAt),
        trades: biz.professions.map((row) => row.profession.slugs[0]?.name ?? row.profession.internalId),
        areas: biz.locations.map((row) => row.location.name),
      };
    })
    .filter((biz) => {
      if (view === "unclaimed") return biz.claimStatus === CLAIM_STATUS.UNCLAIMED;
      if (view === "claimed") {
        return biz.claimStatus === CLAIM_STATUS.CLAIMED || biz.claimStatus === CLAIM_STATUS.VERIFIED;
      }
      if (view === "trial") return biz.trial;
      if (view === "live") return biz.callNowOn;
      if (view === "asked") return biz.asks > 0;
      return true;
    });

  return (
    <main>
      <h1 className="serif text-4xl">Professionals</h1>
      <p className="mt-2 text-ink-soft">
        Every listing customers can find. Call now is only on when the listing is claimed and the trial or subscription is
        live.
      </p>
      {imported.created || imported.importError ? (
        <p className="card mt-6 p-4">
          {imported.importError
            ? "That file could not be imported. Use an Excel or CSV file with a name, trade and town on each row."
            : `Imported ${imported.created} listings · ${imported.invited ?? 0} invited · ${imported.skipped ?? 0} skipped · ${imported.invalid ?? 0} invalid.`}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        {filters.map((filter) => (
          <Link
            key={filter.id}
            href={filter.id === "all" ? "/admin/professionals" : `/admin/professionals?view=${filter.id}`}
            className={
              view === filter.id
                ? "rounded-full bg-ink px-3 py-2 text-paper-strong"
                : "rounded-full border border-line px-3 py-2"
            }
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3">
        {rows.length === 0 ? (
          <p className="card p-5 text-ink-soft">No listings in this view.</p>
        ) : (
          rows.map((biz) => (
            <article key={biz.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="serif text-2xl">
                  <Link href={`/gb/p/${biz.slug}`} className="hover:underline">
                    {biz.name}
                  </Link>
                </h2>
                <p className="text-sm font-semibold">
                  {biz.callNowOn ? "Call now on" : "Call now off"}
                </p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {claimLabel(biz.claimStatus)}
                {biz.trial
                  ? ` · two-month trial${biz.daysLeft != null ? ` · ${biz.daysLeft} days left` : ""}`
                  : biz.subscribed
                    ? " · paying"
                    : biz.paymentState === PAYMENT_STATES.UNSUBSCRIBED
                      ? ""
                      : ` · ${biz.paymentState}`}
                {biz.outreachStatus && biz.outreachStatus !== "NONE" ? ` · outreach ${biz.outreachStatus}` : ""}
                {biz.dataProvenance ? ` · ${biz.dataProvenance}` : ""}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {biz.trades.join(", ") || "No trades"} · {biz.areas.join(", ") || "No areas"} · availability{" "}
                {biz.availability.replaceAll("_", " ").toLowerCase()}
              </p>
              <p className="mt-1 text-sm text-ink-soft">
                {biz._count.calls} Call now {biz._count.calls === 1 ? "tap" : "taps"} · {biz.asks}{" "}
                {biz.asks === 1 ? "ask that could not connect" : "asks that could not connect"} · {biz._count.reviews}{" "}
                {biz._count.reviews === 1 ? "review" : "reviews"}
              </p>
            </article>
          ))
        )}
      </div>

      <form action={importListingsCsv} className="card mt-10 grid gap-3 p-5">
        <h2 className="serif text-2xl">Import listings from Excel or CSV</h2>
        <p className="text-sm text-ink-soft">
          Upload .xlsx or .csv. Needed columns are a business name, a trade, and a town. Email, phone, website and about
          are optional. New towns are added automatically. Call now stays off until they claim. Leave invite emails
          unchecked for a large file so we do not mail thousands of people on day one.
        </p>
        <label>
          <span className="mb-1 block text-sm font-medium">Provenance</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="source"
            placeholder="licensed list, partner, inbound"
            required
          />
        </label>
        <input
          className="rounded-2xl border border-line bg-paper px-4 py-3"
          type="file"
          name="file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          required
        />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="invite" value="1" />
          Email claim invites now
        </label>
        <button className="btn btn-primary" type="submit">
          Import listings
        </button>
      </form>
      <form action={createUnclaimedListing} className="card mt-6 grid gap-3 p-5">
        <h2 className="serif text-2xl">Add unclaimed listing</h2>
        <p className="text-sm text-ink-soft">Only use an email the business gave you. Do not paste scraped contacts.</p>
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" name="name" placeholder="Business name" required />
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" type="email" name="email" placeholder="Work email they provided" required />
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" name="source" placeholder="Provenance e.g. inbound" defaultValue="admin" />
        <select className="rounded-2xl border border-line bg-paper px-4 py-3" name="professionId" required>
          {professions.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.label}
            </option>
          ))}
        </select>
        <select className="rounded-2xl border border-line bg-paper px-4 py-3" name="locationId" required>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          Invite to claim
        </button>
      </form>
    </main>
  );
}
