import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-lg px-4 py-16">
      <h1 className="serif text-4xl">That page is not here</h1>
      <p className="mt-3 text-ink-soft">Try a profession and location search instead.</p>
      <Link href="/" className="btn btn-primary mt-6">
        Back home
      </Link>
    </main>
  );
}
