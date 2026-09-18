import { BackLink } from "@/components/back-link";
import { MarketplaceSearch } from "@/components/marketplace-search";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ country: string }>;
  searchParams: Promise<{ profession?: string; location?: string }>;
}) {
  const { country } = await params;
  const query = await searchParams;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <p className="text-sm text-ink-soft">
        <BackLink href="/" className="font-medium text-moss-deep hover:underline">
          ← Home
        </BackLink>
      </p>
      <h1 className="serif mt-3 text-3xl sm:text-4xl">Choose a trade and an area</h1>
      <p className="mt-3 text-ink-soft">
        We could not open a results page from that search. Pick both fields below and search again.
      </p>
      <div className="mt-6" id="search">
        <MarketplaceSearch
          country={country}
          defaultProfession={query.profession ?? "plumbers"}
          defaultLocation={query.location ?? ""}
        />
      </div>
    </main>
  );
}
