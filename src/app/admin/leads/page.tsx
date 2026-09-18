import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { CLAIM_STATUS } from "@/lib/constants";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminAsksPage() {
  const [asks, unclaimed, claimedBlocked] = await Promise.all([
    prisma.lead.findMany({
      where: { callId: null },
      include: {
        business: true,
        location: true,
        profession: { include: { slugs: { take: 1 } } },
      },
      orderBy: { createdAt: "desc" },
      take: 80,
    }),
    prisma.lead.count({
      where: { callId: null, business: { claimStatus: CLAIM_STATUS.UNCLAIMED, deletedAt: null } },
    }),
    prisma.lead.count({
      where: { callId: null, business: { claimStatus: { not: CLAIM_STATUS.UNCLAIMED }, deletedAt: null } },
    }),
  ]);

  return (
    <main>
      <h1 className="serif text-4xl">Asks</h1>
      <p className="mt-2 text-ink-soft">
        Customers who wanted a professional and could not tap Call now. These are not billed leads. They are demand
        sitting on listings that are unclaimed, or claimed with Call now off.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <AdminStat label="Unclaimed listings asked" value={unclaimed} hint="Call now was off because nobody has claimed" />
        <AdminStat label="Claimed, still not connected" value={claimedBlocked} hint="Trial ended or Call now is off" />
      </div>
      {asks.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">Nobody has asked an unconnected listing yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {asks.map((ask) => (
            <li key={ask.id} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/gb/p/${ask.business.slug}`} className="hover:underline">
                    {ask.business.name}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">{formatLocalDateTime(ask.createdAt)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                {ask.profession.slugs[0]?.name ?? ask.profession.internalId} · {ask.location?.name ?? "no area"} ·{" "}
                {ask.business.claimStatus === CLAIM_STATUS.UNCLAIMED ? "unclaimed" : ask.business.claimStatus.toLowerCase()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
