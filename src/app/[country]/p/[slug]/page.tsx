import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ListingCard } from "@/components/listing-card";
import { ClaimListingCta } from "@/components/claim-listing-cta";
import { BackLink } from "@/components/back-link";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { CLAIM_STATUS } from "@/lib/constants";
import { listingPoint, milesBetween } from "@/lib/locations/distance";
import { listingCallOptions } from "@/lib/phone";
import { isPublicListing } from "@/lib/listings/visibility";
import { marketplaceStats } from "@/lib/subscription";
import { safeInternalPath } from "@/lib/navigation";

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

function fallbackResultsPath(country: string, professionSlug: string, locationSlug: string) {
  return `/${country}/${professionSlug}/${locationSlug}`;
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
  if (!business || !isPublicListing(business)) notFound();
  const status = isAvailabilityLive(
    business.availability?.status ?? "UNKNOWN",
    business.availability?.expiresAt,
  );
  const profession = business.professions[0];
  const professionSlug =
    profession?.profession.slugs.find((row) => row.countryId === business.countryId)?.slug ?? "plumbers";
  const locationSlug = business.locations[0]?.location.slug ?? "catford";
  const resultsHref = safeInternalPath(query.from, fallbackResultsPath(country, professionSlug, locationSlug));
  const resultsUrl = new URL(resultsHref, "http://local.1mileaway");
  const fromSlug = resultsUrl.pathname.split("/").filter(Boolean).at(-1) ?? locationSlug;
  const resultsLabel = fromSlug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  const fromLat = Number(resultsUrl.searchParams.get("lat"));
  const fromLng = Number(resultsUrl.searchParams.get("lng"));
  const fromLocation = await prisma.location.findFirst({
    where: { country: { iso2: country }, slug: fromSlug, active: true },
    select: { lat: true, lng: true },
  });
  const origin =
    Number.isFinite(fromLat) && Number.isFinite(fromLng) && resultsUrl.searchParams.get("lat")
      ? { lat: fromLat, lng: fromLng }
      : fromLocation;
  const distanceMiles = milesBetween(origin, listingPoint(business));
  const unclaimed = business.claimStatus === CLAIM_STATUS.UNCLAIMED;
  const stats = unclaimed ? await marketplaceStats(business.id) : null;
  const trades = business.professions.map(
    (row) => row.profession.slugs.find((slugRow) => slugRow.countryId === business.countryId)?.pluralName ?? row.profession.internalId,
  );
  const areas = business.locations.map((row) => row.location.name);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <p className="mb-4">
        <BackLink href={resultsHref} className="text-sm font-medium text-moss-deep hover:underline">
          ← Back to {resultsLabel} results
        </BackLink>
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-moss-deep">Profile</p>
      <h1 className="serif mt-1.5 text-3xl font-medium leading-snug sm:text-4xl">{business.name}</h1>
      {trades.length > 0 || areas.length > 0 ? (
        <p className="mt-2 text-sm text-ink-soft sm:text-base">
          {[trades.join(" · "), areas.join(", ")].filter(Boolean).join(" · ")}
        </p>
      ) : null}

      <div className="mt-6">
        <ListingCard
          featured
          country={country}
          slug={business.slug}
          name={business.name}
          about={business.about}
          distanceMiles={distanceMiles}
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
      </div>
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
