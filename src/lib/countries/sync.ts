import { prisma } from "@/lib/db";
import { LAUNCH_COUNTRIES } from "@/lib/countries/catalog";
import { ensureProfessionCatalog } from "@/lib/profession-catalog";

const UK_ONLY_FLAG = "launch_uk_only_v1";

async function deactivateNonUkOnce() {
  const done = await prisma.setting.findUnique({ where: { key: UK_ONLY_FLAG } });
  if (done) return;
  await prisma.country.updateMany({ where: { iso2: { not: "gb" } }, data: { active: false } });
  await prisma.setting.upsert({
    where: { key: UK_ONLY_FLAG },
    create: { key: UK_ONLY_FLAG, value: "1" },
    update: {},
  });
}

export async function ensureLaunchCountries() {
  for (const country of LAUNCH_COUNTRIES) {
    await prisma.country.upsert({
      where: { iso2: country.iso2 },
      create: {
        iso2: country.iso2,
        name: country.name,
        currency: country.localCurrency,
        locale: country.locale,
        timezone: country.timezone,
        active: country.iso2 === "gb",
        tier: country.launchOrder,
      },
      update: {
        name: country.name,
        currency: country.localCurrency,
        locale: country.locale,
        timezone: country.timezone,
        tier: country.launchOrder,
      },
    });
  }
  await deactivateNonUkOnce();
}

export async function ensureLaunchCatalog() {
  await ensureLaunchCountries();
  await ensureProfessionCatalog(prisma);
}

export async function ensureLaunchCountriesIfNeeded() {
  const count = await prisma.country.count();
  if (count < LAUNCH_COUNTRIES.length) {
    await ensureLaunchCountries();
    return;
  }
  await deactivateNonUkOnce();
}
