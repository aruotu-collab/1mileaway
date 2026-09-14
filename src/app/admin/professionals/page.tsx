import Link from "next/link";
import { prisma } from "@/lib/db";
import { rankListings } from "@/lib/ranking/engine";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { createUnclaimedListing, importListingsCsv } from "@/app/actions/admin";

export default async function AdminProfessionalsPage({
  searchParams,
}: {
  searchParams: Promise<{
    created?: string;
    invited?: string;
    skipped?: string;
    invalid?: string;
    importError?: string;
  }>;
}) {
  const imported = await searchParams;
  const [professions, locations] = await Promise.all([
    prisma.profession.findMany({ where: { active: true }, orderBy: { internalId: "asc" } }),
    prisma.location.findMany({
      where: { country: { iso2: "gb" }, type: "district", active: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const businesses = await prisma.business.findMany({
    include: { availability: true, trialBalance: true, outstanding: { where: { status: "OPEN" } } },
    orderBy: { name: "asc" },
  });
  const ranked = rankListings(
    businesses.map((biz) => ({
      ...biz,
      distanceMiles: 1,
      availabilityStatus: isAvailabilityLive(biz.availability?.status ?? "UNKNOWN", biz.availability?.expiresAt),
      availabilityExpiresAt: biz.availability?.expiresAt ?? null,
      availabilityConfirmedAt: biz.availability?.confirmedAt ?? null,
    })),
  );

  return (
    <main>
      <h1 className="serif text-4xl">Professionals</h1>
      {imported.created || imported.importError ? (
        <p className="card mt-6 p-4">
          {imported.importError
            ? "That file could not be imported. Use a CSV under 200 rows with name, profession and location."
            : `Imported ${imported.created} listings · ${imported.invited ?? 0} invited · ${imported.skipped ?? 0} skipped · ${imported.invalid ?? 0} invalid.`}
        </p>
      ) : null}
      <form action={importListingsCsv} className="card mt-6 grid gap-3 p-5">
        <h2 className="serif text-2xl">Import listings from CSV</h2>
        <p className="text-sm text-ink-soft">
          Columns: name, email, profession, location, website, phone, about, source. Profession is an id such as
          plumber. Location is a slug such as catford. Email is optional — rows without one are listed but not emailed.
          Only import contacts you are allowed to use.
        </p>
        <label>
          <span className="mb-1 block text-sm font-medium">Provenance</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            name="source"
            placeholder="trade-show, partner, inbound"
            required
          />
        </label>
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" type="file" name="file" accept=".csv,text/csv" required />
        <button className="btn btn-primary" type="submit">
          Import and invite
        </button>
      </form>
      <form action={createUnclaimedListing} className="card mt-6 grid gap-3 p-5">
        <h2 className="serif text-2xl">Add unclaimed listing</h2>
        <p className="text-sm text-ink-soft">Only use an email the business gave you. Do not paste scraped contacts.</p>
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" name="name" placeholder="Business name" required />
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" type="email" name="email" placeholder="Work email they provided" required />
        <input className="rounded-2xl border border-line bg-paper px-4 py-3" name="source" placeholder="Provenance e.g. inbound" defaultValue="admin" />
        <select className="rounded-2xl border border-line bg-paper px-4 py-3" name="professionId" required>
          {professions.map((profession) => (
            <option key={profession.id} value={profession.id}>
              {profession.internalId}
            </option>
          ))}
        </select>
        <select className="rounded-2xl border border-line bg-paper px-4 py-3" name="locationId" required>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.name}
            </option>
          ))}
        </select>
        <button className="btn btn-primary" type="submit">
          Invite to claim
        </button>
      </form>
      <div className="mt-6 grid gap-3">
        {ranked.map((biz) => (
          <article key={biz.id} className="card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="serif text-2xl">
                <Link href={`/gb/p/${biz.slug}`}>{biz.name}</Link>
              </h2>
              <p className="text-sm text-ink-soft">score {biz.score.toFixed(2)}</p>
            </div>
            <p className="mt-1 text-sm text-ink-soft">
              {biz.claimStatus} · {biz.paymentState} · trial {biz.trialBalance?.remaining ?? 0} ·{" "}
              {biz.outstanding.length ? "outstanding lead" : "no balance"}
              {biz.outreachStatus && biz.outreachStatus !== "NONE" ? ` · outreach ${biz.outreachStatus}` : ""}
              {biz.dataProvenance ? ` · ${biz.dataProvenance}` : ""}
            </p>
            <p className="mt-2 text-xs text-ink-soft">
              Availability {biz.explanation.availability.toFixed(2)} · Distance {biz.explanation.distance.toFixed(2)} · Answer{" "}
              {biz.explanation.answer.toFixed(2)} · Verification {biz.explanation.verified.toFixed(2)}
            </p>
          </article>
        ))}
      </div>
    </main>
  );
}
