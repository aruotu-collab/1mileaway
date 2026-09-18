import type { PrismaClient } from "@prisma/client";

export const PROFESSION_CATEGORIES = [
  { slug: "home-emergency", name: "Home emergency", sortOrder: 1 },
  { slug: "construction", name: "Construction", sortOrder: 2 },
  { slug: "garden", name: "Garden", sortOrder: 3 },
  { slug: "cleaning", name: "Cleaning", sortOrder: 4 },
  { slug: "mobile", name: "Mobile services", sortOrder: 5 },
  { slug: "personal-care", name: "Personal care", sortOrder: 6 },
  { slug: "teaching", name: "Teaching", sortOrder: 7 },
  { slug: "childcare", name: "Childcare", sortOrder: 8 },
  { slug: "pets", name: "Pets", sortOrder: 9 },
  { slug: "vehicle", name: "Vehicle", sortOrder: 10 },
  { slug: "professional-services", name: "Professional services", sortOrder: 11 },
] as const;

export type ProfessionDef = {
  internalId: string;
  name: string;
  plural: string;
  slug: string;
  emergencySlug: string | null;
  categorySlug: (typeof PROFESSION_CATEGORIES)[number]["slug"];
  emergencyEligible: boolean;
  synonyms: string[];
};

export const PROFESSION_DEFS: ProfessionDef[] = [
  {
    internalId: "plumber",
    name: "Plumber",
    plural: "Plumbers",
    slug: "plumbers",
    emergencySlug: "emergency-plumbers",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["plumber", "plumbers"],
  },
  {
    internalId: "electrician",
    name: "Electrician",
    plural: "Electricians",
    slug: "electricians",
    emergencySlug: "emergency-electricians",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["electrician", "electricians"],
  },
  {
    internalId: "locksmith",
    name: "Locksmith",
    plural: "Locksmiths",
    slug: "locksmiths",
    emergencySlug: "emergency-locksmiths",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["locksmith", "locksmiths"],
  },
  {
    internalId: "drainage",
    name: "Drainage engineer",
    plural: "Drainage engineers",
    slug: "drainage",
    emergencySlug: "emergency-drainage",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["drainage", "drainage engineer", "drainage engineers"],
  },
  {
    internalId: "heating",
    name: "Heating engineer",
    plural: "Heating engineers",
    slug: "heating-engineers",
    emergencySlug: "emergency-heating",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["heating", "heating engineer", "heating engineers"],
  },
  {
    internalId: "hvac",
    name: "HVAC technician",
    plural: "HVAC technicians",
    slug: "hvac",
    emergencySlug: "emergency-hvac",
    categorySlug: "home-emergency",
    emergencyEligible: true,
    synonyms: ["hvac", "hvac technician", "hvac technicians"],
  },
  {
    internalId: "gardener",
    name: "Gardener",
    plural: "Gardeners",
    slug: "gardeners",
    emergencySlug: null,
    categorySlug: "garden",
    emergencyEligible: false,
    synonyms: ["gardener", "gardeners"],
  },
  {
    internalId: "cleaner",
    name: "Cleaner",
    plural: "Cleaners",
    slug: "cleaners",
    emergencySlug: null,
    categorySlug: "cleaning",
    emergencyEligible: false,
    synonyms: ["cleaner", "cleaners"],
  },
  {
    internalId: "mobile_tyre",
    name: "Mobile tyre repair",
    plural: "Mobile tyre repairs",
    slug: "mobile-tyre-repairs",
    emergencySlug: "emergency-tyre-repairs",
    categorySlug: "mobile",
    emergencyEligible: true,
    synonyms: ["mobile tyre", "mobile tyre repair", "mobile tyre repairs", "mobile tire repair", "mobile tire repairs"],
  },
  {
    internalId: "mobile_car_cleaning",
    name: "Mobile car cleaner",
    plural: "Mobile car cleaners",
    slug: "mobile-car-cleaning",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile car cleaning", "mobile car cleaner", "mobile car cleaners", "mobile valet", "mobile valeting"],
  },
  {
    internalId: "mobile_laundry",
    name: "Mobile laundry",
    plural: "Mobile laundry services",
    slug: "mobile-laundry",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile laundry", "mobile laundry services"],
  },
  {
    internalId: "mobile_mechanic",
    name: "Mobile mechanic",
    plural: "Mobile mechanics",
    slug: "mobile-mechanics",
    emergencySlug: "emergency-mechanics",
    categorySlug: "mobile",
    emergencyEligible: true,
    synonyms: ["mobile mechanic", "mobile mechanics"],
  },
  {
    internalId: "mobile_windscreen",
    name: "Mobile windscreen repair",
    plural: "Mobile windscreen repairs",
    slug: "mobile-windscreen-repairs",
    emergencySlug: "emergency-windscreen-repairs",
    categorySlug: "mobile",
    emergencyEligible: true,
    synonyms: ["mobile windscreen", "mobile windscreen repair", "mobile windscreen repairs"],
  },
  {
    internalId: "mobile_bike_repair",
    name: "Mobile bike repair",
    plural: "Mobile bike repairs",
    slug: "mobile-bike-repairs",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile bike repair", "mobile bike repairs", "mobile cycle repair"],
  },
  {
    internalId: "mobile_carpet",
    name: "Mobile carpet cleaner",
    plural: "Mobile carpet cleaners",
    slug: "mobile-carpet-cleaning",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile carpet cleaning", "mobile carpet cleaner", "mobile carpet cleaners"],
  },
  {
    internalId: "mobile_dog_groomer",
    name: "Mobile dog groomer",
    plural: "Mobile dog groomers",
    slug: "mobile-dog-groomers",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile dog groomer", "mobile dog groomers", "mobile dog grooming"],
  },
  {
    internalId: "mobile_ironing",
    name: "Mobile ironing",
    plural: "Mobile ironing services",
    slug: "mobile-ironing",
    emergencySlug: null,
    categorySlug: "mobile",
    emergencyEligible: false,
    synonyms: ["mobile ironing", "mobile ironing services"],
  },
  {
    internalId: "hairdresser",
    name: "Hairdresser",
    plural: "Hairdressers",
    slug: "hairdressers",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["hairdresser", "hairdressers", "hair stylist", "hair stylists"],
  },
  {
    internalId: "barber",
    name: "Barber",
    plural: "Barbers",
    slug: "barbers",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["barber", "barbers"],
  },
  {
    internalId: "massage",
    name: "Massage therapist",
    plural: "Massage therapists",
    slug: "massage-therapists",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["massage", "massage therapist", "massage therapists", "masseur", "masseuse"],
  },
  {
    internalId: "beauty_therapist",
    name: "Beauty therapist",
    plural: "Beauty therapists",
    slug: "beauty-therapists",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["beauty therapist", "beauty therapists", "beautician", "beauticians"],
  },
  {
    internalId: "nail_technician",
    name: "Nail technician",
    plural: "Nail technicians",
    slug: "nail-technicians",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["nail technician", "nail technicians", "nail tech"],
  },
  {
    internalId: "makeup_artist",
    name: "Makeup artist",
    plural: "Makeup artists",
    slug: "makeup-artists",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["makeup artist", "makeup artists", "make up artist"],
  },
  {
    internalId: "personal_trainer",
    name: "Personal trainer",
    plural: "Personal trainers",
    slug: "personal-trainers",
    emergencySlug: null,
    categorySlug: "personal-care",
    emergencyEligible: false,
    synonyms: ["personal trainer", "personal trainers", "pt"],
  },
  {
    internalId: "music_teacher",
    name: "Music teacher",
    plural: "Music teachers",
    slug: "music-teachers",
    emergencySlug: null,
    categorySlug: "teaching",
    emergencyEligible: false,
    synonyms: ["music teacher", "music teachers", "piano teacher", "guitar teacher"],
  },
  {
    internalId: "tutor",
    name: "Tutor",
    plural: "Tutors",
    slug: "tutors",
    emergencySlug: null,
    categorySlug: "teaching",
    emergencyEligible: false,
    synonyms: ["tutor", "tutors", "private tutor"],
  },
  {
    internalId: "driving_instructor",
    name: "Driving instructor",
    plural: "Driving instructors",
    slug: "driving-instructors",
    emergencySlug: null,
    categorySlug: "teaching",
    emergencyEligible: false,
    synonyms: ["driving instructor", "driving instructors"],
  },
  {
    internalId: "dance_teacher",
    name: "Dance teacher",
    plural: "Dance teachers",
    slug: "dance-teachers",
    emergencySlug: null,
    categorySlug: "teaching",
    emergencyEligible: false,
    synonyms: ["dance teacher", "dance teachers"],
  },
  {
    internalId: "childminder",
    name: "Childminder",
    plural: "Childminders",
    slug: "childminders",
    emergencySlug: null,
    categorySlug: "childcare",
    emergencyEligible: false,
    synonyms: ["childminder", "childminders", "childcare", "child care"],
  },
  {
    internalId: "babysitter",
    name: "Babysitter",
    plural: "Babysitters",
    slug: "babysitters",
    emergencySlug: null,
    categorySlug: "childcare",
    emergencyEligible: false,
    synonyms: ["babysitter", "babysitters", "baby sitter"],
  },
  {
    internalId: "dog_walker",
    name: "Dog walker",
    plural: "Dog walkers",
    slug: "dog-walkers",
    emergencySlug: null,
    categorySlug: "pets",
    emergencyEligible: false,
    synonyms: ["dog walker", "dog walkers"],
  },
  {
    internalId: "pet_sitter",
    name: "Pet sitter",
    plural: "Pet sitters",
    slug: "pet-sitters",
    emergencySlug: null,
    categorySlug: "pets",
    emergencyEligible: false,
    synonyms: ["pet sitter", "pet sitters", "petsitter"],
  },
];

export async function ensureProfessionCatalog(db: PrismaClient) {
  const categoryIds = new Map<string, string>();
  for (const category of PROFESSION_CATEGORIES) {
    const row = await db.professionCategory.upsert({
      where: { slug: category.slug },
      create: { slug: category.slug, name: category.name, sortOrder: category.sortOrder },
      update: { name: category.name, sortOrder: category.sortOrder },
    });
    categoryIds.set(category.slug, row.id);
  }

  const countries = await db.country.findMany({ where: { tier: 1 } });

  for (const def of PROFESSION_DEFS) {
    const categoryId = categoryIds.get(def.categorySlug);
    if (!categoryId) throw new Error(`Missing category ${def.categorySlug}`);

    const profession = await db.profession.upsert({
      where: { internalId: def.internalId },
      create: {
        internalId: def.internalId,
        categoryId,
        emergencyEligible: def.emergencyEligible,
      },
      update: {
        categoryId,
        emergencyEligible: def.emergencyEligible,
        active: true,
      },
    });

    for (const term of def.synonyms) {
      await db.professionSynonym.upsert({
        where: { professionId_term: { professionId: profession.id, term } },
        create: { professionId: profession.id, term },
        update: {},
      });
    }

    for (const country of countries) {
      const existing = await db.professionSlug.findFirst({
        where: { countryId: country.id, professionId: profession.id },
      });
      if (existing) {
        await db.professionSlug.update({
          where: { id: existing.id },
          data: {
            slug: def.slug,
            emergencySlug: def.emergencySlug,
            name: def.name,
            pluralName: def.plural,
          },
        });
      } else {
        await db.professionSlug.create({
          data: {
            professionId: profession.id,
            countryId: country.id,
            slug: def.slug,
            emergencySlug: def.emergencySlug,
            name: def.name,
            pluralName: def.plural,
          },
        });
      }
    }
  }
}
