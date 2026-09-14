import { prisma } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { OUTREACH } from "@/lib/constants";

export type CreateUnclaimedInput = {
  name: string;
  email?: string | null;
  professionId: string;
  locationId: string;
  website?: string | null;
  phone?: string | null;
  phoneReal?: string | null;
  about?: string | null;
  contactEmailSource?: string | null;
  dataProvenance?: string | null;
  availabilitySource?: string;
};

export async function findDuplicateListing(input: { name: string; email?: string | null; locationId: string }) {
  const email = input.email?.trim().toLowerCase();
  if (email) {
    const byEmail = await prisma.business.findFirst({
      where: { contactEmail: email, deletedAt: null },
    });
    if (byEmail) return { business: byEmail, reason: "email" as const };
  }
  const slugBase = slugify(input.name);
  const inArea = await prisma.business.findMany({
    where: { deletedAt: null, locations: { some: { locationId: input.locationId } } },
    select: { id: true, name: true },
  });
  const match = inArea.find((row) => slugify(row.name) === slugBase);
  if (!match) return null;
  const business = await prisma.business.findUniqueOrThrow({ where: { id: match.id } });
  return { business, reason: "name" as const };
}

export async function createUnclaimedListingRecord(input: CreateUnclaimedInput) {
  const location = await prisma.location.findUnique({ where: { id: input.locationId } });
  if (!location) throw new Error("Unknown location");
  const email = input.email?.trim().toLowerCase() || null;
  const duplicate = await findDuplicateListing({ name: input.name, email, locationId: input.locationId });
  if (duplicate) return { ...duplicate, created: false as const };

  const business = await prisma.business.create({
    data: {
      slug: `${slugify(input.name)}-${Date.now().toString().slice(-4)}`,
      name: input.name.trim(),
      countryId: location.countryId,
      claimStatus: "UNCLAIMED",
      contactEmail: email,
      contactEmailSource: email ? input.contactEmailSource ?? null : null,
      dataProvenance: input.dataProvenance ?? null,
      outreachStatus: email ? OUTREACH.ELIGIBLE : OUTREACH.NO_EMAIL,
      website: input.website || null,
      phoneDisplay: input.phone || input.phoneReal || null,
      about: input.about || null,
      professions: { create: { professionId: input.professionId } },
      locations: { create: { locationId: input.locationId, radiusMiles: 3 } },
      availability: { create: { status: "UNKNOWN", source: input.availabilitySource ?? "import" } },
      phoneReal: input.phoneReal || null,
    },
  });
  return { business, created: true as const, reason: null };
}

export async function resolveProfessionKey(value: string) {
  const term = value.trim().toLowerCase();
  if (!term) return null;
  return prisma.profession.findFirst({
    where: {
      active: true,
      OR: [
        { internalId: term },
        { slugs: { some: { slug: term } } },
        { slugs: { some: { emergencySlug: term } } },
      ],
    },
  });
}

export async function resolveLocationKey(value: string, countryIso = "gb") {
  const term = value.trim().toLowerCase();
  if (!term) return null;
  return prisma.location.findFirst({
    where: {
      active: true,
      country: { iso2: countryIso },
      OR: [{ slug: term }, { slugPath: term }, { name: value.trim() }],
    },
  });
}
