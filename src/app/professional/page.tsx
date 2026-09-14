import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { wantWork, imBusy } from "@/app/actions/availability";
import { payOutstanding } from "@/app/actions/payments";
import { updateListingPhone } from "@/app/actions/listing";
import { AvailabilityBadge } from "@/components/availability-badge";
import { LeadConfirmActions } from "@/components/lead-confirm";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { formatMoney } from "@/lib/utils";
import { PAYMENT_STATES } from "@/lib/constants";

export default async function ProfessionalHome({
  searchParams,
}: {
  searchParams: Promise<{ claimed?: string; updated?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const flags = await searchParams;
  const link = await prisma.businessUser.findFirst({
    where: { profileId: user.id },
    include: {
      business: {
        include: {
          availability: true,
          trialBalance: true,
          outstanding: { where: { status: "OPEN" }, include: { lead: true } },
          leads: { orderBy: { createdAt: "desc" }, take: 8 },
        },
      },
    },
  });
  if (!link) {
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

  const biz = link.business;
  const status = isAvailabilityLive(biz.availability?.status ?? "UNKNOWN", biz.availability?.expiresAt);
  const open = biz.outstanding[0];
  const paused = biz.paymentState === PAYMENT_STATES.OUTSTANDING_LEAD;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="text-sm text-ink-soft">{user.email}</p>
      <h1 className="serif mt-1 text-4xl">{biz.name}</h1>
      {flags.claimed ? (
        <p className="card mt-4 p-4">
          Listing claimed. You are on a free trial of qualified leads — no prepaid wallet.
        </p>
      ) : null}
      <div className="mt-4">
        <AvailabilityBadge status={status} confirmedAt={biz.availability?.confirmedAt} />
      </div>
      <p className="mt-3 text-ink-soft">
        Payment state: {biz.paymentState.replace(/_/g, " ").toLowerCase()}. Trial remaining: {biz.trialBalance?.remaining ?? 0}.
      </p>

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">Phone customers call</h2>
        <p className="mt-2 text-ink-soft">
          Call now rings this number directly. Use the phone you actually answer.
        </p>
        <form action={updateListingPhone} className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label>
            <span className="sr-only">Phone number</span>
            <input
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              type="tel"
              name="phone"
              autoComplete="tel"
              defaultValue={biz.phoneReal ?? biz.phoneDisplay ?? ""}
              placeholder="020 7946 0101"
              required
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Save number
          </button>
        </form>
      </section>

      {open ? (
        <section className="card mt-6 p-5">
          <h2 className="serif text-2xl">Settle this lead to continue</h2>
          <p className="mt-2 text-ink-soft">
            {formatMoney(open.amountMinor, open.currency)} is outstanding. You stay listed, but Available Now is paused until this is settled.
          </p>
          <form action={payOutstanding} className="mt-4">
            <button className="btn btn-primary" type="submit">
              Pay to continue
            </button>
          </form>
        </section>
      ) : null}

      <section className="card mt-6 p-5">
        <h2 className="serif text-2xl">I want work</h2>
        <p className="mt-2 text-ink-soft">
          {paused
            ? "Settle the open lead before turning Available Now back on."
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
          <button className="btn btn-primary" type="submit" disabled={paused}>
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
          <h2 className="serif text-2xl">Recent leads</h2>
          <Link href="/professional/leads" className="text-sm underline">
            View all
          </Link>
        </div>
        <ul className="mt-3 grid gap-2">
          {biz.leads.map((lead) => (
            <li key={lead.id} className="card p-4 text-sm">
              {lead.status} · {lead.chargingMode ?? "unqualified"} · {lead.visitorPhone ?? "customer called you"}
              <LeadConfirmActions leadId={lead.id} status={lead.status} />
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
