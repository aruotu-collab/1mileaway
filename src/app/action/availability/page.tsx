import { applyAvailabilityToken } from "@/app/actions/availability";

export default async function AvailabilityActionPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; status?: string; ok?: string; error?: string }>;
}) {
  const query = await searchParams;
  if (query.token && query.status && !query.ok && !query.error) {
    await applyAvailabilityToken(query.token, query.status);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="serif text-4xl">Availability updated</h1>
      {query.error ? (
        <p className="mt-3 text-rust">That link has expired.</p>
      ) : (
        <p className="mt-3 text-ink-soft">Your public listing now reflects this update.</p>
      )}
    </main>
  );
}
