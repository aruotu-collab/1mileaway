import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { parseListingSpreadsheet } from "../src/lib/listings/csv";
import { lookupAddress, lookupUkPlace, lookupUkPostcodes } from "../src/lib/locations/geocode";
import { slugify } from "../src/lib/utils";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const filePath = process.argv[2] ?? "data/imports/all-trades.csv";
  const rows = await parseListingSpreadsheet(await readFile(path.resolve(filePath)), path.basename(filePath));
  const postcodes = rows.map((row) => row.postcode).filter((code) => /[A-Z]{1,2}\d/i.test(code));
  console.log(`looking up ${postcodes.length} postcodes`);
  const points = await lookupUkPostcodes(postcodes);
  console.log(`resolved ${points.size} unique postcodes`);

  const businesses = await prisma.business.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, lat: true, locations: { select: { locationId: true, location: { select: { id: true, name: true } } } } },
  });
  const byKey = new Map(businesses.map((row) => [`${slugify(row.name)}:${slugify(row.locations[0]?.location.name ?? "")}`, row]));
  const townPoints = new Map<string, Array<{ lat: number; lng: number }>>();
  const businessUpdates: Array<{ id: string; lat: number; lng: number }> = [];

  for (const row of rows) {
    const point = points.get(row.postcode.trim().toUpperCase().replace(/\s+/g, " "));
    if (!point) continue;
    const key = `${slugify(row.name)}:${slugify(row.location)}`;
    const business = byKey.get(key);
    const townKey = slugify(row.location);
    const list = townPoints.get(townKey) ?? [];
    list.push(point);
    townPoints.set(townKey, list);
    if (business && business.lat == null && !businessUpdates.some((item) => item.id === business.id)) {
      businessUpdates.push({ id: business.id, lat: point.lat, lng: point.lng });
    }
  }

  for (const [index, batch] of batches(businessUpdates, 200).entries()) {
    await prisma.$transaction(batch.map((row) => prisma.business.update({ where: { id: row.id }, data: { lat: row.lat, lng: row.lng } })));
    console.log(`business coords ${Math.min((index + 1) * 200, businessUpdates.length)}/${businessUpdates.length}`);
  }

  const locations = await prisma.location.findMany({
    where: { country: { iso2: "gb" }, active: true },
    select: { id: true, name: true, slug: true, lat: true, lng: true },
  });
  let townsUpdated = 0;
  for (const location of locations) {
    const samples = townPoints.get(location.slug) ?? townPoints.get(slugify(location.name));
    if (samples?.length) {
      const lat = samples.reduce((sum, row) => sum + row.lat, 0) / samples.length;
      const lng = samples.reduce((sum, row) => sum + row.lng, 0) / samples.length;
      if (location.lat == null || location.lng == null) {
        await prisma.location.update({ where: { id: location.id }, data: { lat, lng } });
        townsUpdated += 1;
      }
      continue;
    }
    if (location.lat != null && location.lng != null) continue;
    const place = await lookupUkPlace(location.name);
    if (place) {
      await prisma.location.update({ where: { id: location.id }, data: { lat: place.lat, lng: place.lng } });
      townsUpdated += 1;
      continue;
    }
    const found = await lookupAddress(`${location.name}, United Kingdom`, "gb");
    if (found) {
      await prisma.location.update({ where: { id: location.id }, data: { lat: found.lat, lng: found.lng } });
      townsUpdated += 1;
    }
    await sleep(1100);
  }
  console.log(JSON.stringify({ businesses: businessUpdates.length, townsUpdated, postcodes: points.size }, null, 2));
}

function batches<T>(items: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
