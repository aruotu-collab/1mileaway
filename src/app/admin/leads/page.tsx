import Link from "next/link";
import { AdminStat } from "@/components/admin-stat";
import { claimUrlForListing } from "@/lib/claim/invite";
import { CLAIM_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { toTelHref } from "@/lib/phone";
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
      phone: string | null;
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
      phone: ask.business.phoneReal || ask.business.phoneDisplay,
      trade: ask.profession.slugs[0]?.name ?? ask.profession.internalId,
      area: ask.location?.name ?? "no area",
      askCount: 1,
      lastAskedAt: ask.createdAt,
    });
  }
  const listings = [...contacted.values()];
  const unclaimed = listings.filter((row) => row.claimStatus === CLAIM_STATUS.UNCLAIMED);
  const ringThem = unclaimed.filter((row) => !row.email?.trim() && row.phone);
  const emailed = listings.filter((row) => row.email?.trim());
  const claimed = listings.filter((row) => row.claimStatus !== CLAIM_STATUS.UNCLAIMED).length;
  const claimUrls = new Map(
    (
      await Promise.all(
        ringThem.map(async (row) => [row.businessId, await claimUrlForListing(row.businessId)] as const),
      )
    ),
  );

  return (
    <main>
      <h1 className="serif text-4xl">Asked to take a job</h1>
      <p className="mt-2 text-ink-soft">
        When a listing has an email, 1mileaway writes to them. When it only has a phone, the customer can text them
        from their own phone. Ring them below only if that message was not sent.
      </p>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AdminStat label="Listings asked" value={listings.length} hint="Unique businesses asked so far" />
        <AdminStat label="Phone-only asks" value={ringThem.length} hint="Customer can text them" />
        <AdminStat label="Emailed" value={emailed.length} hint="We can write to them" />
        <AdminStat label="Total asks" value={asks.length} hint="Every button tap" />
      </div>

      <h2 className="serif mt-10 text-2xl">Ring them</h2>
      <p className="mt-2 text-sm text-ink-soft">
        Uses your phone, same as Call now. Tell them a customer asked them to take a job, then read the claim link.
      </p>
      {ringThem.length === 0 ? (
        <p className="card mt-4 p-5 text-ink-soft">Nobody with only a phone has been asked yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {ringThem.map((row) => {
            const tel = row.phone ? toTelHref(row.phone) : null;
            const claimUrl = claimUrls.get(row.businessId);
            return (
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
                  {row.phone}
                </p>
                <p className="mt-3 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
                  “Hi, it’s 1mileaway. A customer in {row.area} asked you to take a job. Claim your listing at{" "}
                  {claimUrl}.”
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tel ? (
                    <a href={tel} className="btn btn-call">
                      Call them
                    </a>
                  ) : null}
                  {claimUrl ? (
                    <a href={claimUrl} className="btn btn-ghost" target="_blank" rel="noreferrer">
                      Open claim link
                    </a>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <h2 className="serif mt-10 text-2xl">Everyone asked</h2>
      {listings.length === 0 ? (
        <p className="card mt-4 p-5 text-ink-soft">Nobody has asked a listing to take a job yet.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
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
                {row.email
                  ? ` · emailed ${row.email}`
                  : row.phone
                    ? " · no email — ring them"
                    : " · no contact"}
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
