import { BackLink } from "@/components/back-link";
import { MarketplaceSearch } from "@/components/marketplace-search";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="serif text-4xl">That page is not here</h1>
      <p className="mt-3 text-ink-soft">Search for a trade and area, or go back to the last page.</p>
      <div className="mt-6">
        <MarketplaceSearch defaultLocation="" />
      </div>
      <BackLink href="/" className="btn btn-ghost mt-6">
        ← Back
      </BackLink>
    </main>
  );
}
