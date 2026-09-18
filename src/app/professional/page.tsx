import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { wantWork, imBusy } from "@/app/actions/availability";
import { startSubscription } from "@/app/actions/payments";
import { updateListingAbout, updateListingPhone, updateListingProfessions } from "@/app/actions/listing";
import { claimMatchingListing } from "@/app/actions/claim";
import { AvailabilityBadge } from "@/components/availability-badge";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { formatLocalDateTime } from "@/lib/utils";
import { CLAIM_STATUS } from "@/lib/constants";
import { canShowAnswerRate } from "@/lib/reputation";
import { callCountCopy, unclaimedDemandCopy } from "@/lib/listing-insights";
import {
  daysRemaining,
  expireEndedTrials,
  hasStripeBilling,
  isSubscriptionActive,
  isTrialing,
  marketplaceStats,
  subscriptionPriceLabel,
} from "@/lib/subscription";
import { PhoneField } from "@/components/phone-field";
import { ProfessionPicker } from "@/components/profession-picker";
import { callingCodeForCountry } from "@/lib/countries/catalog";
import { listProfessionPicks } from "@/lib/listings/professions";
import { nationalNumberForInput, phonePlaceholder } from "@/lib/phone";

function StatCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-ink-soft">{label}</p>
      <p className="serif mt-1 text-3xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}

export default async function ProfessionalHome({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; updated?: string; error?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const flags = await searchParams;
  const link = await prisma.businessUser.findFirst({
    where: { profileId: user.id },
  });

  if (!link) {
    const waiting = await prisma.business.findFirst({
      where: {
        contactEmail: user.email.toLowerCase(),
        claimStatus: CLAIM_STATUS.UNCLAIMED,
        deletedAt: null,
      },
      include: {
        locations: { include: { location: true } },
        professions: { include: { profession: { include: { slugs: true } } } },
      },
      orderBy: { createdAt: "desc" },
    });
    if (!waiting) {
      return (
        <main className="mx-auto max-w-xl px-4 py-12">
          <h1 className="serif text-4xl">No listing linked yet</h1>
          <p className="mt-3 text-ink-soft">
            Ask an admin to attach this account to a business, or{" "}
            <Link href="/join" className="underline">
              create your own listing
            </Link>{" "}
            with your work email.
          </p>
        </main>
      );
    }
    const stats = await marketplaceStats(waiting.id);
    const trades = waiting.professions.map(
      (row) => row.profession.slugs[0]?.pluralName ?? row.profession.internalId,
    );
    const areas = waiting.locations.map((row) => row.location.name);
    return (
      <main className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-sm text-ink-soft">{user.email}</p>
        <h1 className="serif mt-1 text-4xl">{waiting.name}</h1>
        <p className="mt-2 text-sm font-semibold uppercase tracking-[0.16em] text-moss-deep">Listing not claimed yet</p>
        <p className="mt-3 text-ink-soft">{unclaimedDemandCopy({ asks: stats.asks, asksLast30: stats.asksLast30, trades, areas })}</p>
        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <StatCard label="Customers who asked" value={stats.asks} hint="They could not be connected" />
          <StatCard label="Asks in the last 30 days" value={stats.asksLast30} />
          <StatCard label="Calls through the app" value={stats.totalCalls} hint="Call now stays off until you claim" />
        </section>
        <section className="card mt-6 p-5">
          <h2 className="serif text-2xl">What customers already see</h2>
          <dl className="mt-3 grid gap-2 text-sm">
            <div>
              <dt className="text-ink-soft">Trades</dt>
              <dd>{trades.join(", ") || "None set"}</dd>
            </div>
            <div>
              <dt className="text-ink-soft">Areas</dt>
              <dd>{areas.join(", ") || "None set"}</dd>
            </div>
          </dl>
          <p className="mt-3 text-ink-soft">
            We do not show page views, call length, or whether a phone was answered. After you claim you get two months
            free with no card, Call now on your own number, and a count of every tap through the web app.
          </p>
          <form action={claimMatchingListing} className="mt-4">
            <button className="btn btn-primary" type="submit">
              Claim this listing
            </button>
          </form>
        </section>
      </main>
    );
  }

  await expireEndedTrials();
  const [biz, professionPicks, stats, asks] = await Promise.all([
    prisma.business.findUniqueOrThrow({
      where: { id: link.businessId },
      include: {
        country: true,
        availability: true,
        subscription: true,
        professions: { include: { profession: { include: { slugs: true } } } },
        locations: { include: { location: true } },
        calls: { orderBy: { startedAt: "desc" }, take: 8, include: { lead: { include: { location: true } } } },
      },
    }),
    listProfessionPicks(),
    marketplaceStats(link.businessId),
    prisma.lead.findMany({
      where: { businessId: link.businessId, callId: null },
      include: { location: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  const status = isAvailabilityLive(biz.availability?.status ?? "UNKNOWN", biz.availability?.expiresAt);
  const periodEnd = biz.subscription?.currentPeriodEnd ?? null;
  const subscribed = isSubscriptionActive(biz.paymentState, periodEnd);
  const trial = isTrialing(biz.paymentState, periodEnd);
  const cardSaved = hasStripeBilling(biz.subscription?.provider, biz.subscription?.providerSubscriptionId);
  const daysLeft = daysRemaining(periodEnd);
  const country = biz.country.iso2;
  const profileHref = `/${country}/p/${biz.slug}`;
  const trades = biz.professions.map((row) => row.profession.slugs[0]?.name ?? row.profession.internalId);
  const areas = biz.locations.map((row) => row.location.name);
  const listingLive = subscribed;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-ink-soft">{user.email}</p>
      <h1 className="serif mt-1 text-4xl">{biz.name}</h1>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <AvailabilityBadge status={status} confirmedAt={biz.availability?.confirmedAt} />
        {trial ? (
          <span className="rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold text-moss-deep">
            Free trial{daysLeft != null ? ` · ${daysLeft} days left` : ""}
          </span>
        ) : subscribed ? (
          <span className="rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold text-moss-deep">Call now on</span>
        ) : (
          <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">Call now off</span>
        )}
        <Link href={profileHref} className="text-sm underline">
          View public listing
        </Link>
      </div>
      {flags.claimed ? (
        <p className="card mt-4 p-4">
          Listing claimed. Tick every trade you do below so customers can find you. You have two months free. Customers
          can tap Call now; we email you and log every tap so you can see if 1mileaway is sending you work.
        </p>
      ) : null}
      {flags.updated ? <p className="card mt-4 p-4">Your listing was updated.</p> : null}
      {flags.error === "trades" ? <p className="mt-4 text-rust">Tick at least one trade you do.</p> : null}
      {flags.error === "phone" ? <p className="mt-4 text-rust">Enter the phone customers should call.</p> : null}

      <section className="mt-6">
        <h2 className="serif text-2xl">Calls through the web app</h2>
        <p className="mt-2 text-ink-soft">{callCountCopy(stats)}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="All-time Call now taps" value={stats.totalCalls} />
          <StatCard label="Last 7 days" value={stats.callsLast7} />
          <StatCard label="Last 30 days" value={stats.callsLast30} />
          <StatCard
            label="Asked, not connected"
            value={stats.asks}
            hint={stats.asksLast30 ? `${stats.asksLast30} in the last 30 days` : undefined}
          />
        </div>
        <p className="mt-2 text-sm text-ink-soft">
          Use these numbers to decide whether {subscriptionPriceLabel()} is worth it.
          {stats.lastCallAt ? ` Last Call now tap ${formatLocalDateTime(stats.lastCallAt)}.` : ""}
          {stats.lastAskAt && stats.asks ? ` Last unanswered ask ${formatLocalDateTime(stats.lastAskAt)}.` : ""}
        </p>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="card p-5">
          <p className="text-sm text-ink-soft">Reviews from 1mileaway calls</p>
          <p className="serif mt-1 text-3xl">
            {stats.reviewCount > 0 ? `${stats.ratingAvg.toFixed(1)} / 5` : "None yet"}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {stats.reviewCount > 0
              ? `${stats.reviewCount} published ${stats.reviewCount === 1 ? "review" : "reviews"}`
              : "They appear after a customer calls and rates you."}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-sm text-ink-soft">Answer rate</p>
          <p className="serif mt-1 text-3xl">
            {canShowAnswerRate(biz.answerReports)
              ? `${Math.round(biz.answerRate * 100)}%`
              : `${biz.answerReports}/5`}
          </p>
          <p className="mt-1 text-xs text-ink-soft">
            {canShowAnswerRate(biz.answerReports)
              ? "Published on your public listing."
              : "We wait for five customer reports before showing this to the public."}
          </p>
        </div>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">
          {trial ? "Free trial" : subscribed ? "Monthly listing is on" : "Subscribe to keep taking calls"}
        </h2>
        <p className="mt-2 text-ink-soft">
          {trial
            ? `Call now is free until ${periodEnd ? formatLocalDateTime(periodEnd) : "the end of your trial"}${daysLeft != null ? ` (${daysLeft} days left)` : ""}. No card is needed for the trial. Subscribe when you want ${subscriptionPriceLabel()} to continue after that.`
            : subscribed
              ? "Customers can call your number from 1mileaway. Each tap emails you and appears below."
              : `${subscriptionPriceLabel()}. Customers cannot ring you through the app until this is active.`}
        </p>
        {subscribed && !trial ? (
          <Link href="/professional/payments" className="btn btn-ghost mt-4">
            Manage subscription
          </Link>
        ) : trial && cardSaved ? (
          <p className="mt-4 text-ink-soft">Your card is saved. The first charge is when the trial ends.</p>
        ) : (
          <form action={startSubscription} className="mt-4">
            <button className="btn btn-primary" type="submit">
              {trial ? "Add a card for after the trial" : "Subscribe"}
            </button>
          </form>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">Your listing</h2>
        <p className="mt-2 text-ink-soft">
          {listingLive
            ? "Customers can already find this listing and tap Call now."
            : "Customers can already find this listing. Call now stays off until a trial or subscription is active."}
        </p>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-ink-soft">Trades</dt>
            <dd>{trades.join(", ") || "None set"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Areas</dt>
            <dd>{areas.join(", ") || "None set"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Phone customers call</dt>
            <dd>{biz.phoneReal ?? biz.phoneDisplay ?? "Not set"}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Public page</dt>
            <dd>
              <Link href={profileHref} className="underline">
                {profileHref}
              </Link>
            </dd>
          </div>
        </dl>
        <form action={updateListingAbout} className="mt-4 grid gap-3">
          <label>
            <span className="mb-1 block text-sm font-medium">About</span>
            <textarea
              className="min-h-28 w-full rounded-2xl border border-line bg-paper px-4 py-3"
              name="about"
              defaultValue={biz.about ?? ""}
              placeholder="What you do and the areas you cover"
            />
          </label>
          <button className="btn btn-primary justify-self-start" type="submit">
            Save about
          </button>
        </form>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">Trades you do</h2>
        <p className="mt-2 text-ink-soft">
          Tick every profession this listing should appear under. A plumber who also does heating can show in both
          searches.
        </p>
        <form action={updateListingProfessions} className="mt-4 grid gap-3">
          <ProfessionPicker
            professions={professionPicks}
            selectedIds={biz.professions.map((row) => row.professionId)}
          />
          <button className="btn btn-primary justify-self-start" type="submit">
            Save trades
          </button>
        </form>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">Phone customers call</h2>
        <p className="mt-2 text-ink-soft">Call now rings this number directly. Use the phone you actually answer.</p>
        <form action={updateListingPhone} className="mt-4 grid gap-3">
          <label>
            <span className="sr-only">Phone number</span>
            <PhoneField
              callingCode={callingCodeForCountry(country)}
              defaultValue={nationalNumberForInput(biz.phoneReal ?? biz.phoneDisplay, country)}
              placeholder={phonePlaceholder(country)}
              required
            />
          </label>
          <button className="btn btn-primary justify-self-start" type="submit">
            Save number
          </button>
        </form>
      </section>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">I want work</h2>
        <p className="mt-2 text-ink-soft">
          {!subscribed
            ? "Subscribe or wait until a trial is active before turning Available Now on."
            : biz.availability?.expiresAt
              ? `Current window ends ${biz.availability.expiresAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}.`
              : "Tell nearby customers you can take a job."}
        </p>
        <form action={wantWork} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label>
            <span className="sr-only">Availability window</span>
            <select className="w-full rounded-2xl border border-line bg-paper px-4 py-3" name="window" defaultValue="now">
              <option value="now">Available now (about 4 hours)</option>
              <option value="today">Available today</option>
            </select>
          </label>
          <button className="btn btn-primary" type="submit" disabled={!subscribed}>
            I WANT WORK
          </button>
        </form>
        <form action={imBusy} className="mt-3">
          <button className="btn btn-ghost" type="submit">
            I’m busy now
          </button>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="serif text-2xl">Recent activity</h2>
          <Link href="/professional/leads" className="text-sm underline">
            View all
          </Link>
        </div>
        {biz.calls.length === 0 && asks.length === 0 ? (
          <p className="mt-3 text-sm text-ink-soft">No 1mileaway activity yet. Call now taps and unanswered asks will show here.</p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {biz.calls.map((call) => (
              <li key={call.id} className="card p-4 text-sm">
                Customer tapped Call now · {formatLocalDateTime(call.startedAt)}
                {call.lead?.location?.name ? ` · ${call.lead.location.name}` : ""}
                {call.toNumber ? ` · rang ${call.toNumber}` : ""}
              </li>
            ))}
            {asks.map((lead) => (
              <li key={lead.id} className="card p-4 text-sm">
                Customer asked, not connected · {formatLocalDateTime(lead.createdAt)}
                {lead.location?.name ? ` · ${lead.location.name}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
