import Link from "next/link";
import { prisma } from "@/lib/db";
import { createOwnListing } from "@/app/actions/join";
import { ProfessionPicker } from "@/components/profession-picker";
import { listProfessionPicks } from "@/lib/listings/professions";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; profession?: string; location?: string; name?: string }>;
}) {
  const query = await searchParams;
  const [professions, locations] = await Promise.all([
    listProfessionPicks(),
    prisma.location.findMany({
      where: { country: { iso2: "gb" }, type: "district", active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const professionKey = (query.profession ?? "").toLowerCase();
  const locationKey = (query.location ?? "").toLowerCase();
  const selectedProfession =
    professions.find(
      (profession) =>
        profession.id === query.profession ||
        profession.slug === professionKey ||
        profession.label.toLowerCase() === professionKey,
    ) ??
    professions.find((profession) => profession.slug === "plumbers") ??
    professions[0];
  const selectedLocation =
    locations.find(
      (location) => location.id === query.location || location.slug === locationKey || location.name.toLowerCase() === locationKey,
    ) ?? locations[0];

  return (
    <main className="mx-auto max-w-md px-4 py-12">
      <h1 className="serif text-4xl">Join 1mileaway</h1>
      <p className="mt-3 text-ink-soft">
        Create your listing with your own work email. You get two months free — we count every customer call so you can
        see if it is worth paying for. We do not collect contact details from other websites.
      </p>
      {query.error ? <p className="mt-3 text-rust">Please fill in every field, including at least one trade.</p> : null}
      <form action={createOwnListing} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Business name</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="name"
            defaultValue={query.name ?? ""}
            required
          />
        </label>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Trades you do</legend>
          <p className="mb-2 text-sm text-ink-soft">Tick every profession customers should find you under.</p>
          <ProfessionPicker professions={professions} selectedIds={selectedProfession ? [selectedProfession.id] : []} />
        </fieldset>
        <label>
          <span className="mb-1 block text-sm font-medium">Main area</span>
          <select
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="locationId"
            defaultValue={selectedLocation?.id}
            required
          >
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Work email</span>
          <input className="w-full rounded-2xl border border-line bg-paper px-4 py-3" type="email" name="email" required />
        </label>
        <label>
          <span className="mb-1 block text-sm font-medium">Phone customers should call</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            type="tel"
            name="phone"
            autoComplete="tel"
            placeholder="020 7946 0101"
            required
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Create listing
        </button>
      </form>
      <p className="mt-8 text-sm text-ink-soft">
        Already invited?{" "}
        <Link href="/login" className="underline">
          Sign in
        </Link>
      </p>
    </main>
  );
}
