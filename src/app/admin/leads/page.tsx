import Link from "next/link";
import { prisma } from "@/lib/db";
import { AdminStat } from "@/components/admin-stat";
import { CLAIM_STATUS } from "@/lib/constants";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminAsksPage() {
  const asks = await prisma.lead.findMany({
    where: { callId: null },
    include: {
      business: { include: { country: true } },
      location: true,
      profession: { include: { slugs: { take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const contacted = new Map<
    string,
    {
      businessId: string;
      name: string;
      slug: string;
      country: string;
      claimStatus: string;
      email: string | null;
      trade: string;
      area: string;
      askCount: number;
      lastAskedAt: Date;
    }
  >();
  for (const ask of asks) {
    const current = contacted.get(ask.businessId);
    if (current) {
      current.askCount += 1;
      continue;
    }
    contacted.set(ask.businessId, {
      businessId: ask.businessId,
      name: ask.business.name,
      slug: ask.business.slug,
      country: ask.business.country.iso2,
      claimStatus: ask.business.claimStatus,
      email: ask.business.contactEmail,
      trade: ask.profession.slugs[0]?.name ?? ask.profession.internalId,
      area: ask.location?.name ?? "no area",
      askCount: 1,
      lastAskedAt: ask.createdAt,
    });
  }
  const listings = [...contacted.values()];
  const unclaimed = listings.filter((row) => row.claimStatus === CLAIM_STATUS.UNCLAIMED).length;
  const claimed = listings.length - unclaimed;

  return (
    <main>
      <h1 className="serif text-4xl">Asked to take a job</h1>
      <p className="mt-2 text-ink-soft">
        Listings a customer has already asked via <strong>Ask them to take this job</strong>. This is who has been
        contacted. These are not billed leads. Still-unclaimed clicks also sit on{" "}
        <Link href="/admin/calls#unclaimed" className="text-moss-deep hover:underline">
          Taps
        </Link>
        .
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <AdminStat label="Listings contacted" value={listings.length} hint="Unique businesses asked so far" />
        <AdminStat label="Unclaimed of those" value={unclaimed} hint="Still waiting to claim" />
        <AdminStat label="Total asks" value={asks.length} hint="Every button tap" />
      </div>
      {listings.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">Nobody has asked a listing to take a job yet.</p>
      ) : (
        <ul className="mt-6 grid gap-3">
          {listings.map((row) => (
            <li key={row.businessId} className="card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="font-semibold">
                  <Link href={`/${row.country}/p/${row.slug}`} className="hover:underline">
                    {row.name}
                  </Link>
                </p>
                <p className="text-sm text-ink-soft">Last asked {formatLocalDateTime(row.lastAskedAt)}</p>
              </div>
              <p className="mt-1 text-sm text-ink-soft">
                Asked {row.askCount} {row.askCount === 1 ? "time" : "times"} · {row.trade} · {row.area} ·{" "}
                {row.claimStatus === CLAIM_STATUS.UNCLAIMED ? "unclaimed" : row.claimStatus.toLowerCase()}
                {row.email ? ` · ${row.email}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {claimed > 0 ? (
        <p className="mt-4 text-sm text-ink-soft">
          {claimed} of these listings are already claimed.{" "}
          <Link href="/admin/claims" className="text-moss-deep hover:underline">
            See daily conversions →
          </Link>
        </p>
      ) : null}
    </main>
  );
}
