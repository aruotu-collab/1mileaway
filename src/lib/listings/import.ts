import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { resolveProfessionKey } from "@/lib/listings/create";
import type { ListingCsvRow } from "@/lib/listings/csv";
import { normalizeListingPhone } from "@/lib/phone";
import { OUTREACH } from "@/lib/constants";
import { slugify } from "@/lib/utils";

const CHUNK = 250;

function titleName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\w\S*/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
}

function chunks<T>(items: T[], size = CHUNK) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export async function ensureImportLocation(value: string, countryIso: string) {
  const country = await prisma.country.findUnique({ where: { iso2: countryIso } });
  if (!country) return null;
  const slug = slugify(value);
  if (!slug) return null;
  const slugPath = `${countryIso}/${slug}`;
  const existing = await prisma.location.findFirst({
    where: { countryId: country.id, OR: [{ slug }, { slugPath }, { name: value.trim() }] },
  });
  if (existing) return existing;
  return prisma.location.create({
    data: {
      countryId: country.id,
      type: "district",
      slug,
      slugPath,
      name: titleName(value),
      active: true,
    },
  });
}

async function loadLocations(rows: ListingCsvRow[]) {
  const needed = new Map<string, { countryIso: string; name: string }>();
  for (const row of rows) {
    const countryIso = row.country || "gb";
    const name = row.location.trim();
    if (!name) continue;
    needed.set(`${countryIso}:${name.toLowerCase()}`, { countryIso, name });
  }

  const locations = new Map<string, Awaited<ReturnType<typeof ensureImportLocation>>>();
  for (const [countryIso, names] of groupByCountry(needed.values())) {
    const country = await prisma.country.findUnique({ where: { iso2: countryIso } });
    if (!country) continue;
    const existing = await prisma.location.findMany({ where: { countryId: country.id } });
    const bySlug = new Map(existing.map((row) => [row.slug, row]));
    const byName = new Map(existing.map((row) => [row.name.trim().toLowerCase(), row]));
    const fresh = [];
    for (const name of names) {
      const slug = slugify(name);
      if (!slug) continue;
      const found = bySlug.get(slug) ?? byName.get(name.toLowerCase());
      if (found) {
        locations.set(`${countryIso}:${name.toLowerCase()}`, found);
        continue;
      }
      const created = {
        id: randomUUID(),
        countryId: country.id,
        type: "district",
        slug,
        slugPath: `${countryIso}/${slug}`,
        name: titleName(name),
        active: true,
      };
      fresh.push(created);
      locations.set(`${countryIso}:${name.toLowerCase()}`, created as Awaited<ReturnType<typeof ensureImportLocation>>);
    }
    for (const chunk of chunks(fresh)) {
      await prisma.location.createMany({ data: chunk });
    }
    console.log(`import locations ready for ${countryIso}: ${names.length}`);
  }
  return locations;
}

function groupByCountry(items: Iterable<{ countryIso: string; name: string }>) {
  const grouped = new Map<string, string[]>();
  for (const item of items) {
    const list = grouped.get(item.countryIso) ?? [];
    list.push(item.name);
    grouped.set(item.countryIso, list);
  }
  return grouped;
}

export async function importListingRows(
  rows: ListingCsvRow[],
  options: { source: string; invite: boolean },
) {
  let created = 0;
  let invited = 0;
  let skipped = 0;
  let invalid = 0;
  const professions = new Map<string, Awaited<ReturnType<typeof resolveProfessionKey>>>();

  for (const row of rows) {
    if (!row.name || !row.profession || !row.location) {
      invalid += 1;
      continue;
    }
    const professionKey = row.profession.toLowerCase();
    if (!professions.has(professionKey)) {
      professions.set(professionKey, await resolveProfessionKey(row.profession));
    }
  }

  console.log(`import mapping ${rows.length} rows, ${professions.size} trades`);
  const locations = await loadLocations(rows);

  const existing = await prisma.business.findMany({
    where: {
      deletedAt: null,
      locations: { some: { locationId: { in: [...locations.values()].flatMap((row) => (row ? [row.id] : [])) } } },
    },
    select: {
      name: true,
      locations: { select: { locationId: true } },
      professions: { select: { professionId: true } },
    },
  });
  const seen = new Set<string>();
  for (const business of existing) {
    for (const loc of business.locations) {
      for (const profession of business.professions) {
        seen.add(`${slugify(business.name)}:${loc.locationId}:${profession.professionId}`);
      }
    }
  }

  const businesses: Array<{
    id: string;
    slug: string;
    name: string;
    countryId: string;
    claimStatus: string;
    contactEmail: string | null;
    contactEmailSource: string | null;
    dataProvenance: string;
    outreachStatus: string;
    website: string | null;
    phoneDisplay: string | null;
    phoneReal: string | null;
    about: string | null;
  }> = [];
  const professionLinks: Array<{ businessId: string; professionId: string }> = [];
  const locationLinks: Array<{ businessId: string; locationId: string; radiusMiles: number }> = [];
  const availability: Array<{ businessId: string; status: string; source: string }> = [];

  for (const row of rows) {
    if (!row.name || !row.profession || !row.location) continue;
    const countryIso = row.country || "gb";
    const profession = professions.get(row.profession.toLowerCase());
    const location = locations.get(`${countryIso}:${row.location.toLowerCase()}`);
    if (!profession || !location) {
      invalid += 1;
      continue;
    }
    const key = `${slugify(row.name)}:${location.id}:${profession.id}`;
    if (seen.has(key)) {
      skipped += 1;
      continue;
    }
    seen.add(key);
    const email = row.email.includes("@") ? row.email : null;
    const phone = row.phone ? normalizeListingPhone(row.phone, countryIso) : null;
    const provenance = `csv:${row.source || options.source}`;
    const id = randomUUID();
    businesses.push({
      id,
      slug: `${slugify(row.name) || "listing"}-${slugify(row.location) || "area"}-${id.slice(0, 8)}`,
      name: row.name.trim(),
      countryId: location.countryId,
      claimStatus: "UNCLAIMED",
      contactEmail: email,
      contactEmailSource: email ? provenance : null,
      dataProvenance: provenance,
      outreachStatus: email ? OUTREACH.ELIGIBLE : OUTREACH.NO_EMAIL,
      website: row.website || null,
      phoneDisplay: phone?.phoneDisplay || row.phone || null,
      phoneReal: phone?.phoneReal || row.phone || null,
      about: row.about || null,
    });
    professionLinks.push({ businessId: id, professionId: profession.id });
    locationLinks.push({ businessId: id, locationId: location.id, radiusMiles: 3 });
    availability.push({ businessId: id, status: "UNKNOWN", source: "csv" });
  }

  console.log(`import inserting ${businesses.length} listings`);
  for (const [index, chunk] of chunks(businesses).entries()) {
    await prisma.business.createMany({ data: chunk });
    created += chunk.length;
    console.log(`import businesses ${Math.min((index + 1) * CHUNK, businesses.length)}/${businesses.length}`);
  }
  for (const chunk of chunks(professionLinks)) {
    await prisma.businessProfession.createMany({ data: chunk, skipDuplicates: true });
  }
  for (const chunk of chunks(locationLinks)) {
    await prisma.businessLocation.createMany({ data: chunk, skipDuplicates: true });
  }
  for (const chunk of chunks(availability)) {
    await prisma.businessAvailability.createMany({ data: chunk, skipDuplicates: true });
  }

  if (options.invite) {
    throw new Error("Bulk invite is off for a file this large. Re-run without --invite.");
  }

  return { created, invited, skipped, invalid };
}
