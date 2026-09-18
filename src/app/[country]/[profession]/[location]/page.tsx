import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { MarketplaceSearch } from "@/components/marketplace-search";
import { ListingCard } from "@/components/listing-card";
import { AddYourBusinessCta } from "@/components/claim-listing-cta";
import { BackLink } from "@/components/back-link";
import { listingCallOptions } from "@/lib/phone";
import { getActiveCountry, getLocationBySlug, getProfessionBySlug, listingsFor, nearbyLocations } from "@/lib/locations/service";
import { isIndexable, robotsDirective } from "@/lib/seo/indexability";
import { prisma } from "@/lib/db";
import { AVAILABILITY } from "@/lib/constants";
import { withQuery } from "@/lib/navigation";

type Params = { country: string; profession: string; location: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { country, profession, location } = await params;
  const countryRow = await getActiveCountry(country);
  if (!countryRow) return { title: "Not found" };
  const professionRow = await getProfessionBySlug(countryRow.id, profession);
  const locationRow = await getLocationBySlug(countryRow.id, location);
  if (!professionRow || !locationRow) return { title: "Not found" };
  const listings = await listingsFor({
    countryId: countryRow.id,
    professionId: professionRow.professionId,
    location: locationRow,
  });
  const override = await prisma.seoPageOverride.findUnique({
    where: { path: `/${country}/${profession}/${location}` },
  });
  const indexable = isIndexable({
    listingCount: listings.length,
    uniqueBusinesses: new Set(listings.map((l) => l.id)).size,
    hasLocalCopy: true,
    overrideNoindex: override?.noindex,
  });
  const emergency = profession === professionRow.emergencySlug;
  const title =
    override?.title ??
    `${emergency ? "Emergency " : ""}${professionRow.pluralName} in ${locationRow.name}`;
  const description =
    override?.description ??
    `${listings.length} ${professionRow.pluralName.toLowerCase()} serve ${locationRow.name}. See who is recently available.`;
  return {
    title,
    description,
    alternates: { canonical: `/${country}/${profession}/${location}` },
    robots: robotsDirective(indexable),
  };
}

export default async function LocationProfessionPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams: Promise<{
    availableNow?: string;
    sort?: string;
    verified?: string;
    near?: string;
    lat?: string;
    lng?: string;
    asked?: string;
    callError?: string;
  }>;
}) {
  const { country, profession, location } = await params;
  const query = await searchParams;
  const countryRow = await getActiveCountry(country);
  if (!countryRow?.active) notFound();
  const professionRow = await getProfessionBySlug(countryRow.id, profession);
  const locationRow = await getLocationBySlug(countryRow.id, location);
  if (!professionRow || !locationRow) notFound();

  const emergency = profession === professionRow.emergencySlug;
  if (emergency && !professionRow.profession.emergencyEligible) notFound();

  const visitorLat = Number(query.lat);
  const visitorLng = Number(query.lng);
  const visitorOrigin =
    Number.isFinite(visitorLat) && Number.isFinite(visitorLng) && query.lat && query.lng
      ? { lat: visitorLat, lng: visitorLng }
      : null;
  const visitorParams = {
    near: query.near,
    lat: query.lat,
    lng: query.lng,
  };
  const withVisitor = (path: string, extra: Record<string, string | undefined> = {}) =>
    withQuery(path, { ...visitorParams, ...extra });

  const listings = await listingsFor({
    countryId: countryRow.id,
    professionId: professionRow.professionId,
    location: locationRow,
    origin: visitorOrigin,
    filters: {
      availableNow: query.availableNow === "1",
      verified: query.verified === "1",
      sort:
        (query.sort as "recommended" | "nearest" | "available" | "rated") ??
        (emergency ? "available" : "recommended"),
      emergency,
    },
  });

  const nearby = await nearbyLocations(locationRow.id);
  const availableNow = listings.filter((l) => l.availabilityStatus === AVAILABILITY.AVAILABLE_NOW).length;
  const resultsHref = withVisitor(`/${country}/${profession}/${location}`);
  const sort = query.sort ?? (emergency ? "available" : "recommended");
  const filterClass = (active: boolean) =>
    active
      ? "rounded-full bg-ink px-3 py-2 text-paper-strong"
      : "rounded-full border border-line px-3 py-2";

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <p className="text-sm text-ink-soft">
        <BackLink href="/" className="font-medium text-moss-deep hover:underline">
          ← Home
        </BackLink>
        {" / "}
        {countryRow.name} / {professionRow.pluralName}
      </p>

      <div className="mt-4" id="search">
        <MarketplaceSearch
          key={`${profession}:${location}:${query.near ?? ""}`}
          country={country}
          defaultProfession={professionRow.slug}
          defaultLocation={query.near ?? locationRow.name}
          emergency={emergency}
          regularHref={withVisitor(`/${country}/${professionRow.slug}/${location}`)}
          emergencyHref={
            professionRow.emergencySlug
              ? withVisitor(`/${country}/${professionRow.emergencySlug}/${location}`)
              : withVisitor(`/${country}/${professionRow.slug}/${location}`, { sort: "available" })
          }
        />
      </div>

      <h1 className="serif mt-6 text-3xl leading-tight sm:text-4xl">
        {emergency ? "Emergency " : ""}
        {professionRow.pluralName} in {locationRow.name}
      </h1>
      <p className="mt-3 text-base text-ink-soft sm:text-lg">
        {listings.length === 0
          ? `Nobody is listed for ${locationRow.name} yet. Try a nearby area or another trade.`
          : `${listings.length} serve ${locationRow.name}${availableNow ? ` · ${availableNow} recently available` : ""}${query.near ? ` · distances from ${query.near}` : ""}. Call now uses your phone — you place the call yourself.`}
      </p>
      {query.asked === "1" ? (
        <p className="card mt-4 p-4">
          We have asked that professional to join. If they are already on 1mileaway, we asked them to turn Call now back
          on. You can still ring anyone below who is live.
        </p>
      ) : null}
      {query.callError ? (
        <p className="card mt-4 p-4">
          That number is not available through 1mileaway right now. Try the next professional below.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <Link
          className={filterClass(!query.availableNow && !query.verified && sort === "recommended")}
          href={withVisitor(`/${country}/${profession}/${location}`, { sort: "recommended" })}
        >
          Recommended
        </Link>
        <Link
          className={filterClass(sort === "nearest")}
          href={withVisitor(`/${country}/${profession}/${location}`, { sort: "nearest" })}
        >
          Closest
        </Link>
        <Link
          className={filterClass(query.availableNow === "1")}
          href={withVisitor(`/${country}/${profession}/${location}`, { availableNow: "1" })}
        >
          Available now
        </Link>
        <Link
          className={filterClass(query.verified === "1")}
          href={withVisitor(`/${country}/${profession}/${location}`, { verified: "1" })}
        >
          Verified
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="card mt-8 p-6">
          <p className="font-semibold">No professionals are listed for this area yet.</p>
          <p className="mt-2 text-ink-soft">
            Search again with the form above, or try a nearby area. If you do this work, you can add your listing.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4">
          {listings.map((listing, index) => (
            <ListingCard
              key={listing.id}
              featured={index === 0}
              country={country}
              slug={listing.slug}
              name={listing.name}
              about={listing.about}
              distanceMiles={listing.distanceMiles}
              availabilityStatus={listing.availabilityStatus}
              availabilityConfirmedAt={listing.availabilityConfirmedAt}
              answerRate={listing.answerRate}
              answerReports={listing.answerReports}
              ratingAvg={listing.ratingAvg}
              ratingCount={listing.ratingCount}
              claimStatus={listing.claimStatus}
              sponsored={listing.sponsored}
              businessId={listing.id}
              professionId={professionRow.professionId}
              locationId={locationRow.id}
              resultsHref={resultsHref}
              fromVisitor={Boolean(visitorOrigin)}
              {...listingCallOptions(listing)}
            />
          ))}
        </div>
      )}

      <AddYourBusinessCta
        professionLabel={professionRow.name.toLowerCase()}
        locationName={locationRow.name}
        joinHref={`/join?profession=${encodeURIComponent(professionRow.slug)}&location=${encodeURIComponent(locationRow.slug)}`}
      />

      <section className="mt-12">
        <h2 className="serif text-2xl">Nearby areas</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {nearby.map((loc) => (
            <Link
              key={loc.id}
              href={withVisitor(`/${country}/${profession}/${loc.slug}`)}
              className="rounded-full border border-line bg-paper-strong px-4 py-2"
            >
              {loc.name}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
