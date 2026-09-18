import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { formatLocalDateTime } from "@/lib/utils";
import { marketplaceStats } from "@/lib/subscription";

export default async function ProfessionalLeadsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/leads");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/professional");
  const [calls, asks, stats] = await Promise.all([
    prisma.call.findMany({
      where: { businessId: link.businessId },
      include: { lead: { include: { location: true } } },
      orderBy: { startedAt: "desc" },
    }),
    prisma.lead.findMany({
      where: { businessId: link.businessId, callId: null },
      include: { location: true },
      orderBy: { createdAt: "desc" },
    }),
    marketplaceStats(link.businessId),
  ]);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="serif text-4xl">Calls from 1mileaway</h1>
      <p className="mt-2 text-ink-soft">
        Every time a customer taps Call now in the web app, we email you and add it here. We count taps, not whether
        the phone was answered or how long you spoke.
      </p>
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
      {calls.length === 0 && asks.length === 0 ? (
        <p className="card mt-6 p-5">No 1mileaway calls yet. They will appear here as soon as a customer uses the app.</p>
      ) : null}
      <ul className="mt-6 grid gap-3">
        {calls.map((call) => (
          <li key={call.id} className="card p-4">
            <p className="font-semibold">Customer tapped Call now</p>
            <p className="mt-1 text-sm text-ink-soft">
              {formatLocalDateTime(call.startedAt)}
              {call.lead?.location?.name ? ` · ${call.lead.location.name}` : ""}
              {call.toNumber ? ` · rang ${call.toNumber}` : ""}
            </p>
          </li>
        ))}
        {asks.map((lead) => (
          <li key={lead.id} className="card p-4">
            <p className="font-semibold">Customer asked for you</p>
            <p className="mt-1 text-sm text-ink-soft">
              {formatLocalDateTime(lead.createdAt)}
              {lead.location?.name ? ` · ${lead.location.name}` : ""} · they could not be connected until your listing is
              active
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
