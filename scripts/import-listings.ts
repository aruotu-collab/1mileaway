import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "../src/lib/db";
import { resolveProfessionKey } from "../src/lib/listings/create";
import { parseListingSpreadsheet } from "../src/lib/listings/csv";
import { importListingRows } from "../src/lib/listings/import";
import { ensureProfessionCatalog } from "../src/lib/profession-catalog";

function argValue(flag: string) {
  const index = process.argv.indexOf(flag);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath || filePath.startsWith("--")) {
    throw new Error("Usage: npx tsx scripts/import-listings.ts <file.xlsx|csv> [--source licensed-list] [--invite] [--dry-run]");
  }
  const source = argValue("--source") || "licensed-list";
  const invite = process.argv.includes("--invite");
  const dryRun = process.argv.includes("--dry-run");
  const resolved = path.resolve(filePath);
  console.log(`reading ${resolved}`);
  const rows = await parseListingSpreadsheet(await readFile(resolved), path.basename(resolved));
  if (rows.length === 0) throw new Error("No usable rows found");
  console.log(`parsed ${rows.length} rows`);

  const trades = new Map<string, number>();
  const towns = new Map<string, number>();
  let missingCore = 0;
  for (const row of rows) {
    if (!row.name || !row.profession || !row.location) {
      missingCore += 1;
      continue;
    }
    trades.set(row.profession, (trades.get(row.profession) ?? 0) + 1);
    towns.set(`${row.country}:${row.location}`, (towns.get(`${row.country}:${row.location}`) ?? 0) + 1);
  }

  await ensureProfessionCatalog(prisma);
  const unmatched: string[] = [];
  for (const trade of trades.keys()) {
    if (!(await resolveProfessionKey(trade))) unmatched.push(trade);
  }

  console.log(
    JSON.stringify(
      {
        file: resolved,
        rows: rows.length,
        missingNameTradeOrTown: missingCore,
        uniqueTrades: trades.size,
        uniqueTowns: towns.size,
        unmatchedTrades: unmatched.sort(),
        sample: rows.slice(0, 5).map((row) => ({
          name: row.name,
          profession: row.profession,
          location: row.location,
          phone: row.phone ? "yes" : "no",
          email: row.email ? "yes" : "no",
        })),
      },
      null,
      2,
    ),
  );

  if (dryRun) return;

  const result = await importListingRows(rows, { source, invite });
  console.log(JSON.stringify({ imported: result }, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
