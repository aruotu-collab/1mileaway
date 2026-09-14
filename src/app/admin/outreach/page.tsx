import { prisma } from "@/lib/db";
import { OUTREACH } from "@/lib/constants";
import { runOutreachTick } from "@/app/actions/outreach";

export default async function AdminOutreachPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; skipped?: string }>;
}) {
  const query = await searchParams;
  const [eligible, invited, followup, complete, unsubscribed, noEmail, due] = await Promise.all([
    prisma.business.count({ where: { outreachStatus: OUTREACH.ELIGIBLE, deletedAt: null } }),
    prisma.business.count({ where: { outreachStatus: OUTREACH.INVITE_SENT, deletedAt: null } }),
    prisma.business.count({ where: { outreachStatus: OUTREACH.FOLLOWUP_1, deletedAt: null } }),
    prisma.business.count({ where: { outreachStatus: OUTREACH.COMPLETE, deletedAt: null } }),
    prisma.business.count({ where: { outreachStatus: OUTREACH.UNSUBSCRIBED, deletedAt: null } }),
    prisma.business.count({ where: { outreachStatus: OUTREACH.NO_EMAIL, deletedAt: null } }),
    prisma.business.count({
      where: {
        deletedAt: null,
        outreachStatus: { in: [OUTREACH.INVITE_SENT, OUTREACH.FOLLOWUP_1] },
        outreachNextAt: { lte: new Date() },
      },
    }),
  ]);

  const cards = [
    ["Due now", due],
    ["Invite sent", invited],
    ["First follow-up sent", followup],
    ["Sequence complete", complete],
    ["No email", noEmail],
    ["Unsubscribed", unsubscribed],
    ["Eligible, not yet invited", eligible],
  ] as const;

  return (
    <main>
      <h1 className="serif text-4xl">Outreach</h1>
      <p className="mt-2 text-ink-soft">
        At most three emails: invite, day 3, day 8. Then stop. Process due follow-ups here, or hit the cron
        route. Do not import scraped addresses.
      </p>
      {query.sent ? (
        <p className="card mt-4 p-4">
          Sent {query.sent} follow-ups · skipped {query.skipped ?? 0}.
        </p>
      ) : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="card p-5">
            <p className="text-sm text-ink-soft">{label}</p>
            <p className="serif mt-1 text-3xl">{value}</p>
          </div>
        ))}
      </div>
      <form action={runOutreachTick} className="card mt-6 grid gap-3 p-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="ignoreSchedule" value="1" />
          Include not-yet-due (local test only)
        </label>
        <button className="btn btn-primary" type="submit">
          Process follow-ups
        </button>
      </form>
    </main>
  );
}
