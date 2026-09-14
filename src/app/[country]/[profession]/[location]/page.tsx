import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SearchBox } from "@/components/search-box";
import { UrgencyTabs } from "@/components/urgency-tabs";
import { ListingCard } from "@/components/listing-card";
import { AddYourBusinessCta } from "@/components/claim-listing-cta";
import { PhoneIcon } from "@/components/phone-icon";
import { startCall } from "@/app/actions/calls";
import { getActiveCountry, getLocationBySlug, getProfessionBySlug, listingsFor, nearbyLocations } from "@/lib/locations/service";
import { isIndexable, robotsDirective } from "@/lib/seo/indexability";
import { prisma } from "@/lib/db";
import { AVAILABILITY } from "@/lib/constants";

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
  const visitorQuery = new URLSearchParams();
  if (query.near) visitorQuery.set("near", query.near);
  if (query.lat) visitorQuery.set("lat", query.lat);
  if (query.lng) visitorQuery.set("lng", query.lng);
  const visitorSuffix = visitorQuery.toString();
  const withVisitor = (href: string) => (visitorSuffix ? `${href}${href.includes("?") ? "&" : "?"}${visitorSuffix}` : href);

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
  const featured = listings[0];
  const resultsHref = withVisitor(`/${country}/${profession}/${location}`);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-sm text-ink-soft">
        <Link href="/">Home</Link> / {countryRow.name} / {professionRow.pluralName}
      </p>
      <h1 className="serif mt-3 text-4xl leading-tight sm:text-5xl">
        {emergency ? "Emergency " : ""}
        {professionRow.pluralName} in {locationRow.name}
      </h1>
      <p className="mt-4 text-lg text-ink-soft">
        {listings.length} serve {locationRow.name}
        {availableNow ? ` · ${availableNow} recently available` : ""}
        {query.near ? ` · distances from ${query.near}` : ""}
      </p>

      {professionRow.profession.emergencyEligible && professionRow.emergencySlug ? (
        <div className="mt-6 max-w-md">
          <UrgencyTabs
            emergency={emergency}
            regularHref={withVisitor(`/${country}/${professionRow.slug}/${location}`)}
            emergencyHref={withVisitor(`/${country}/${professionRow.emergencySlug}/${location}`)}
          />
        </div>
      ) : null}

      <div className="mt-6">
        <SearchBox
          key={query.near ?? locationRow.slug}
          country={country}
          defaultProfession={professionRow.slug}
          defaultLocation={query.near ?? locationRow.name}
          emergency={emergency}
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2 text-sm">
        <a className="rounded-full border border-line px-3 py-2" href={withVisitor("?sort=recommended")}>
          Recommended
        </a>
        <a className="rounded-full border border-line px-3 py-2" href={withVisitor("?sort=nearest")}>
          Nearest
        </a>
        <a className="rounded-full border border-line px-3 py-2" href={withVisitor("?availableNow=1")}>
          Available now
        </a>
        <a className="rounded-full border border-line px-3 py-2" href={withVisitor("?verified=1")}>
          Verified
        </a>
      </div>

      {featured ? (
        <section className="mt-8">
          <h2 className="serif text-2xl">Start with this professional</h2>
          <div className="mt-3">
            <ListingCard
              featured
              country={country}
              slug={featured.slug}
              name={featured.name}
              about={featured.about}
              distanceMiles={featured.distanceMiles}
              availabilityStatus={featured.availabilityStatus}
              availabilityConfirmedAt={featured.availabilityConfirmedAt}
              answerRate={featured.answerRate}
              ratingAvg={featured.ratingAvg}
              ratingCount={featured.ratingCount}
              claimStatus={featured.claimStatus}
              sponsored={featured.sponsored}
              businessId={featured.id}
              professionId={professionRow.professionId}
              locationId={locationRow.id}
              resultsHref={resultsHref}
              fromVisitor={Boolean(visitorOrigin)}
            />
          </div>
          <form action={startCall} className="sticky bottom-3 z-20 mt-3 sm:hidden">
            <input type="hidden" name="businessId" value={featured.id} />
            <input type="hidden" name="professionId" value={professionRow.professionId} />
            <input type="hidden" name="locationId" value={locationRow.id} />
            <input type="hidden" name="country" value={country} />
            <button className="btn btn-primary w-full shadow-lg" type="submit">
              <PhoneIcon />
              Call {featured.name}
            </button>
          </form>
        </section>
      ) : (
        <p className="card mt-8 p-6">No professionals are listed for this area yet.</p>
      )}

      {listings.length > 1 ? (
        <section className="mt-10">
          <h2 className="serif text-2xl">See all options</h2>
          <div className="mt-4 grid gap-4">
            {listings.map((listing) => (
              <ListingCard
                key={listing.id}
                country={country}
                slug={listing.slug}
                name={listing.name}
                about={listing.about}
                distanceMiles={listing.distanceMiles}
                availabilityStatus={listing.availabilityStatus}
                availabilityConfirmedAt={listing.availabilityConfirmedAt}
                answerRate={listing.answerRate}
                ratingAvg={listing.ratingAvg}
                ratingCount={listing.ratingCount}
                claimStatus={listing.claimStatus}
                sponsored={listing.sponsored}
                businessId={listing.id}
                professionId={professionRow.professionId}
                locationId={locationRow.id}
                resultsHref={resultsHref}
                fromVisitor={Boolean(visitorOrigin)}
              />
            ))}
          </div>
        </section>
      ) : null}

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
