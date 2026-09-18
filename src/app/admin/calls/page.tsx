import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { callStatusLabel } from "@/lib/admin/insights";
import { CALL_OUTCOME } from "@/lib/feedback";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminCallsPage() {
  const [calls, answered, noAnswer, waiting] = await Promise.all([
    prisma.call.findMany({
      include: { business: true, lead: { include: { location: true } }, review: true },
      orderBy: { startedAt: "desc" },
      take: 80,
    }),
    prisma.call.count({ where: { status: CALL_OUTCOME.ANSWERED } }),
    prisma.call.count({ where: { status: CALL_OUTCOME.NO_ANSWER } }),
    prisma.call.count({ where: { status: { notIn: [CALL_OUTCOME.ANSWERED, CALL_OUTCOME.NO_ANSWER] } } }),
  ]);

  return (
    <main>
      <h1 className="serif text-4xl">Calls</h1>
      <p className="mt-2 text-ink-soft">
        Every Call now tap through the web app. We cannot hear the call or know how long it lasted. Answered / no answer
        is only what the customer reported afterwards.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <AdminStat label="Call now taps" value={answered + noAnswer + waiting} />
        <AdminStat label="Customer said answered" value={answered} />
        <AdminStat label="Customer said no answer" value={noAnswer} hint={`${waiting} not yet reported`} />
      </div>
      {calls.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No Call now taps yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {calls.map((call) => (
            <li key={call.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/gb/p/${call.business.slug}`} className="hover:underline">
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
