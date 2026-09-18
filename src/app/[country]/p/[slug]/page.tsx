import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";
import { ClaimListingCta } from "@/components/claim-listing-cta";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { CLAIM_STATUS } from "@/lib/constants";
import { listingCallOptions } from "@/lib/phone";
import { marketplaceStats } from "@/lib/subscription";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const business = await prisma.business.findUnique({ where: { slug } });
  if (!business) return { title: "Professional" };
  return {
    title: business.name,
    description: business.about ?? `${business.name} on 1mileaway`,
  };
}

function safeReturnPath(from: string | undefined, fallback: string) {
  if (!from) return fallback;
  if (!from.startsWith("/") || from.startsWith("//")) return fallback;
  return from;
}

export default async function ProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string; slug: string }>;
  searchParams: Promise<{ from?: string; claimSent?: string; claimError?: string }>;
}) {
  const { country, slug } = await params;
  const query = await searchParams;
  const business = await prisma.business.findUnique({
    where: { slug },
    include: {
      availability: true,
      subscription: true,
      locations: { include: { location: true } },
      professions: { include: { profession: { include: { slugs: true } } } },
      reviews: { where: { published: true }, orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!business || business.deletedAt) notFound();
  const status = isAvailabilityLive(
    business.availability?.status ?? "UNKNOWN",
    business.availability?.expiresAt,
  );
  const profession = business.professions[0];
  const professionSlug =
    profession?.profession.slugs.find((row) => row.countryId === business.countryId)?.slug ?? "plumbers";
  const locationSlug = business.locations[0]?.location.slug ?? "catford";
  const resultsHref = safeReturnPath(query.from, `/${country}/${professionSlug}/${locationSlug}`);
  const fromSlug = resultsHref.split("/").filter(Boolean).at(-1) ?? locationSlug;
  const resultsLabel = fromSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const unclaimed = business.claimStatus === CLAIM_STATUS.UNCLAIMED;
  const stats = unclaimed ? await marketplaceStats(business.id) : null;
  const trades = business.professions.map(
    (row) => row.profession.slugs.find((slugRow) => slugRow.countryId === business.countryId)?.pluralName ?? row.profession.internalId,
  );
  const areas = business.locations.map((row) => row.location.name);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-4">
        <Link href={resultsHref} className="text-sm font-medium text-moss-deep hover:underline">
          ← Back to {resultsLabel} results
        </Link>
      </p>
      <ListingCard
        featured
        country={country}
        slug={business.slug}
        name={business.name}
        about={business.about}
        distanceMiles={0.6}
        availabilityStatus={status}
        availabilityConfirmedAt={business.availability?.confirmedAt}
        answerRate={business.answerRate}
        answerReports={business.answerReports}
        ratingAvg={business.ratingAvg}
        ratingCount={business.ratingCount}
        claimStatus={business.claimStatus}
        businessId={business.id}
        professionId={profession?.professionId}
        locationId={business.locations[0]?.locationId}
        showProfileLink={false}
        {...listingCallOptions(business)}
      />
      {unclaimed && stats ? (
        <ClaimListingCta
          businessId={business.id}
          country={country}
          slug={business.slug}
          name={business.name}
          contactEmail={business.contactEmail}
          from={query.from}
          sent={query.claimSent === "1"}
          error={query.claimError}
          asks={stats.asks}
          asksLast30={stats.asksLast30}
          trades={trades}
          areas={areas}
        />
      ) : null}
      <section className="mt-8">
        <h2 className="serif text-2xl">Areas served</h2>
        <p className="mt-2 text-ink-soft">
          {business.locations.map((l) => l.location.name).join(", ")}
        </p>
      </section>
      <section className="mt-8">
        <h2 className="serif text-2xl">Reviews from 1mileaway calls</h2>
        {business.reviews.length === 0 ? (
          <p className="mt-2 text-ink-soft">No reviews yet. They appear after a customer calls and rates this listing.</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {business.reviews.map((review) => (
              <li key={review.id} className="card p-4">
                <p className="font-semibold">{review.rating}/5</p>
                {review.body ? <p className="mt-1 text-ink-soft">{review.body}</p> : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
