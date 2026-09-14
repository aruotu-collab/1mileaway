import { PrismaClient } from "@prisma/client";
import { createHash } from "crypto";

const prisma = new PrismaClient();

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

async function main() {
  await prisma.analyticsEvent.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.adminNote.deleteMany();
  await prisma.emailEvent.deleteMany();
  await prisma.emailMessage.deleteMany();
  await prisma.emailSuppression.deleteMany();
  await prisma.actionToken.deleteMany();
  await prisma.review.deleteMany();
  await prisma.paymentEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.outstandingLeadBalance.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.callEvent.deleteMany();
  await prisma.call.deleteMany();
  await prisma.trackingNumber.deleteMany();
  await prisma.businessVerification.deleteMany();
  await prisma.availabilityHistory.deleteMany();
  await prisma.businessAvailability.deleteMany();
  await prisma.businessUser.deleteMany();
  await prisma.businessLocation.deleteMany();
  await prisma.businessProfession.deleteMany();
  await prisma.trialBalance.deleteMany();
  await prisma.trialConfig.deleteMany();
  await prisma.leadPrice.deleteMany();
  await prisma.business.deleteMany();
  await prisma.locationAlias.deleteMany();
  await prisma.seoPageOverride.deleteMany();
  await prisma.location.deleteMany();
  await prisma.professionSynonym.deleteMany();
  await prisma.professionSlug.deleteMany();
  await prisma.profession.deleteMany();
  await prisma.professionCategory.deleteMany();
  await prisma.session.deleteMany();
  await prisma.magicLink.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.country.deleteMany();
  await prisma.setting.deleteMany();

  const countries = await Promise.all(
    [
      { iso2: "gb", name: "United Kingdom", currency: "GBP", locale: "en-GB", timezone: "Europe/London", active: true, tier: 1 },
      { iso2: "us", name: "United States", currency: "USD", locale: "en-US", timezone: "America/Chicago", active: true, tier: 1 },
      { iso2: "ca", name: "Canada", currency: "CAD", locale: "en-CA", timezone: "America/Toronto", active: true, tier: 1 },
      { iso2: "au", name: "Australia", currency: "AUD", locale: "en-AU", timezone: "Australia/Sydney", active: true, tier: 1 },
      { iso2: "nz", name: "New Zealand", currency: "NZD", locale: "en-NZ", timezone: "Pacific/Auckland", active: true, tier: 1 },
      { iso2: "ie", name: "Ireland", currency: "EUR", locale: "en-IE", timezone: "Europe/Dublin", active: true, tier: 1 },
      { iso2: "de", name: "Germany", currency: "EUR", locale: "de-DE", timezone: "Europe/Berlin", active: false, tier: 2 },
      { iso2: "fr", name: "France", currency: "EUR", locale: "fr-FR", timezone: "Europe/Paris", active: false, tier: 2 },
      { iso2: "nl", name: "Netherlands", currency: "EUR", locale: "nl-NL", timezone: "Europe/Amsterdam", active: false, tier: 2 },
    ].map((c) => prisma.country.create({ data: c })),
  );
  const gb = countries.find((c) => c.iso2 === "gb")!;
  const us = countries.find((c) => c.iso2 === "us")!;

  const categories = await Promise.all(
    [
      { slug: "home-emergency", name: "Home emergency", sortOrder: 1 },
      { slug: "construction", name: "Construction", sortOrder: 2 },
      { slug: "garden", name: "Garden", sortOrder: 3 },
      { slug: "cleaning", name: "Cleaning", sortOrder: 4 },
      { slug: "vehicle", name: "Vehicle", sortOrder: 5 },
      { slug: "professional-services", name: "Professional services", sortOrder: 6 },
    ].map((c) => prisma.professionCategory.create({ data: c })),
  );
  const emergency = categories.find((c) => c.slug === "home-emergency")!;
  const garden = categories.find((c) => c.slug === "garden")!;
  const cleaning = categories.find((c) => c.slug === "cleaning")!;

  const professionDefs = [
    { internalId: "plumber", name: "Plumber", plural: "Plumbers", slug: "plumbers", emergencySlug: "emergency-plumbers", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "electrician", name: "Electrician", plural: "Electricians", slug: "electricians", emergencySlug: "emergency-electricians", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "locksmith", name: "Locksmith", plural: "Locksmiths", slug: "locksmiths", emergencySlug: "emergency-locksmiths", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "drainage", name: "Drainage engineer", plural: "Drainage engineers", slug: "drainage", emergencySlug: "emergency-drainage", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "heating", name: "Heating engineer", plural: "Heating engineers", slug: "heating-engineers", emergencySlug: "emergency-heating", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "hvac", name: "HVAC technician", plural: "HVAC technicians", slug: "hvac", emergencySlug: "emergency-hvac", categoryId: emergency.id, emergencyEligible: true },
    { internalId: "gardener", name: "Gardener", plural: "Gardeners", slug: "gardeners", emergencySlug: null, categoryId: garden.id, emergencyEligible: false },
    { internalId: "cleaner", name: "Cleaner", plural: "Cleaners", slug: "cleaners", emergencySlug: null, categoryId: cleaning.id, emergencyEligible: false },
  ];

  const professions = [];
  for (const def of professionDefs) {
    const profession = await prisma.profession.create({
      data: {
        internalId: def.internalId,
        categoryId: def.categoryId,
        emergencyEligible: def.emergencyEligible,
        synonyms: { create: [{ term: def.plural.toLowerCase() }, { term: def.name.toLowerCase() }] },
        slugs: {
          create: countries
            .filter((c) => c.tier === 1)
            .map((country) => ({
              countryId: country.id,
              slug: def.slug,
              emergencySlug: def.emergencySlug,
              name: def.name,
              pluralName: def.plural,
            })),
        },
      },
    });
    professions.push(profession);
  }
  const plumber = professions.find((p) => p.internalId === "plumber")!;
  const electrician = professions.find((p) => p.internalId === "electrician")!;
  const locksmith = professions.find((p) => p.internalId === "locksmith")!;
  const drainage = professions.find((p) => p.internalId === "drainage")!;

  const london = await prisma.location.create({
    data: {
      countryId: gb.id,
      type: "city",
      slug: "london",
      slugPath: "gb/london",
      name: "London",
      lat: 51.5074,
      lng: -0.1278,
    },
  });

  const districts = [
    { slug: "catford", name: "Catford", lat: 51.4452, lng: -0.0209 },
    { slug: "lewisham", name: "Lewisham", lat: 51.4613, lng: -0.0103 },
    { slug: "peckham", name: "Peckham", lat: 51.4742, lng: -0.0694 },
    { slug: "croydon", name: "Croydon", lat: 51.3762, lng: -0.0982 },
    { slug: "wandsworth", name: "Wandsworth", lat: 51.457, lng: -0.191 },
  ];
  const gbLocations = [];
  for (const d of districts) {
    gbLocations.push(
      await prisma.location.create({
        data: {
          countryId: gb.id,
          parentId: london.id,
          type: "district",
          slug: d.slug,
          slugPath: `gb/london/${d.slug}`,
          name: d.name,
          lat: d.lat,
          lng: d.lng,
        },
      }),
    );
  }
  const catford = gbLocations.find((l) => l.slug === "catford")!;
  const lewisham = gbLocations.find((l) => l.slug === "lewisham")!;
  const peckham = gbLocations.find((l) => l.slug === "peckham")!;
  const croydon = gbLocations.find((l) => l.slug === "croydon")!;

  await prisma.location.create({
    data: {
      countryId: us.id,
      type: "city",
      slug: "chicago",
      slugPath: "us/chicago",
      name: "Chicago",
      lat: 41.8781,
      lng: -87.6298,
    },
  });

  await prisma.trialConfig.create({ data: { scope: "global", freeLeads: 5 } });
  await prisma.leadPrice.createMany({
    data: [
      { countryId: gb.id, professionId: plumber.id, amountMinor: 2500, currency: "GBP" },
      { countryId: gb.id, professionId: electrician.id, amountMinor: 2500, currency: "GBP" },
      { countryId: gb.id, professionId: locksmith.id, amountMinor: 2000, currency: "GBP" },
      { countryId: gb.id, professionId: drainage.id, amountMinor: 2800, currency: "GBP" },
      { countryId: gb.id, amountMinor: 2200, currency: "GBP" },
      { countryId: us.id, amountMinor: 3500, currency: "USD" },
    ],
  });

  const admin = await prisma.profile.create({
    data: { email: "aruotu@gmail.com", name: "Super admin", role: "super_admin" },
  });

  const people = [
    {
      email: "kira@demo.1mileaway.com",
      person: "Kira Mensah",
      name: "Kira Plumbing",
      slug: "kira-plumbing",
      about: "Local plumber covering Catford and Lewisham. Boilers, leaks, and blocked waste.",
      professionId: plumber.id,
      locations: [catford.id, lewisham.id],
      claimStatus: "VERIFIED",
      paymentState: "FREE_TRIAL_ACTIVE",
      remaining: 5,
      status: "AVAILABLE_NOW",
      expiresAt: hoursFromNow(3),
      ratingAvg: 4.8,
      ratingCount: 26,
      answerRate: 0.91,
      phone: "020 7946 0101",
    },
    {
      email: "sam@demo.1mileaway.com",
      person: "Sam Okeke",
      name: "Lewisham Heat & Water",
      slug: "lewisham-heat-water",
      about: "Heating and plumbing from Lewisham. Gas Safe registered.",
      professionId: plumber.id,
      locations: [lewisham.id, catford.id],
      claimStatus: "CLAIMED",
      paymentState: "FREE_TRIAL_ACTIVE",
      remaining: 5,
      status: "AVAILABLE_TODAY",
      expiresAt: hoursFromNow(10),
      ratingAvg: 4.6,
      ratingCount: 18,
      answerRate: 0.84,
      phone: "020 7946 0102",
    },
    {
      email: "lee@demo.1mileaway.com",
      person: "Lee Grant",
      name: "Grant Pipework",
      slug: "grant-pipework",
      about: "Independent plumber. Trial used — next connection is a trust lead.",
      professionId: plumber.id,
      locations: [catford.id, peckham.id],
      claimStatus: "CLAIMED",
      paymentState: "TRUST_LEAD_AVAILABLE",
      remaining: 0,
      used: 5,
      status: "AVAILABLE_NOW",
      expiresAt: hoursFromNow(2),
      ratingAvg: 4.4,
      ratingCount: 11,
      answerRate: 0.77,
      phone: "020 7946 0103",
    },
    {
      email: "pat@demo.1mileaway.com",
      person: "Pat Singh",
      name: "Singh Local Plumbing",
      slug: "singh-local-plumbing",
      about: "Settled and ready after payment. Still listed while a lead is outstanding.",
      professionId: plumber.id,
      locations: [catford.id, croydon.id],
      claimStatus: "CLAIMED",
      paymentState: "OUTSTANDING_LEAD",
      remaining: 0,
      used: 5,
      status: "UNKNOWN",
      expiresAt: null,
      ratingAvg: 4.2,
      ratingCount: 9,
      answerRate: 0.7,
      phone: "020 7946 0104",
    },
    {
      email: "moe@demo.1mileaway.com",
      person: "Moe Ali",
      name: "South Circular Electric",
      slug: "south-circular-electric",
      about: "Electrician for Catford and nearby. Fuse boards and fault finding.",
      professionId: electrician.id,
      locations: [catford.id, lewisham.id],
      claimStatus: "VERIFIED",
      paymentState: "FREE_TRIAL_ACTIVE",
      remaining: 5,
      status: "AVAILABLE_NOW",
      expiresAt: hoursFromNow(4),
      ratingAvg: 4.9,
      ratingCount: 31,
      answerRate: 0.88,
      phone: "020 7946 0105",
    },
    {
      email: "riz@demo.1mileaway.com",
      person: "Riz Khan",
      name: "Riz Lock & Key",
      slug: "riz-lock-key",
      about: "24-hour locksmith. Non-destructive entry where possible.",
      professionId: locksmith.id,
      locations: [catford.id, lewisham.id, peckham.id],
      claimStatus: "CLAIMED",
      paymentState: "FREE_TRIAL_ACTIVE",
      remaining: 5,
      status: "AVAILABLE_TODAY",
      expiresAt: hoursFromNow(8),
      ratingAvg: 4.7,
      ratingCount: 14,
      answerRate: 0.8,
      phone: "020 7946 0106",
    },
  ];

  for (const person of people) {
    const profile = await prisma.profile.create({
      data: { email: person.email, name: person.person, role: "professional" },
    });
    const business = await prisma.business.create({
      data: {
        slug: person.slug,
        name: person.name,
        countryId: gb.id,
        claimStatus: person.claimStatus,
        paymentState: person.paymentState,
        phoneDisplay: person.phone,
        phoneReal: person.phone,
        about: person.about,
        ratingAvg: person.ratingAvg,
        ratingCount: person.ratingCount,
        answerRate: person.answerRate,
        professions: { create: { professionId: person.professionId } },
        locations: { create: person.locations.map((locationId) => ({ locationId, radiusMiles: 3 })) },
        users: { create: { profileId: profile.id, role: "owner" } },
        availability: {
          create: {
            status: person.status,
            confirmedAt: new Date(),
            expiresAt: person.expiresAt,
            source: "seed",
          },
        },
        trialBalance: {
          create: { remaining: person.remaining, used: person.used ?? 0 },
        },
        trackingNumbers: {
          create: { number: `SIM-${person.slug.slice(0, 8).toUpperCase()}` },
        },
        verifications:
          person.claimStatus === "VERIFIED"
            ? { create: { kind: "identity", status: "verified", notes: "Seed verified listing" } }
            : undefined,
      },
    });

    if (person.paymentState === "OUTSTANDING_LEAD") {
      const call = await prisma.call.create({
        data: {
          businessId: business.id,
          fromNumber: "+447700900111",
          toNumber: "SIM-PAT",
          durationSeconds: 96,
          status: "completed",
          endedAt: new Date(),
        },
      });
      const lead = await prisma.lead.create({
        data: {
          businessId: business.id,
          countryId: gb.id,
          professionId: plumber.id,
          locationId: catford.id,
          callId: call.id,
          visitorPhone: "+447700900111",
          status: "QUALIFIED",
          qualification: "CONNECTED",
          chargingMode: "TRUST_LEAD",
          priceMinor: 2500,
          currency: "GBP",
          qualifiedAt: new Date(),
        },
      });
      await prisma.outstandingLeadBalance.create({
        data: {
          businessId: business.id,
          leadId: lead.id,
          amountMinor: 2500,
          currency: "GBP",
          status: "OPEN",
        },
      });
    }
  }

  await prisma.business.create({
    data: {
      slug: "rushey-green-plumbing",
      name: "Rushey Green Plumbing",
      countryId: gb.id,
      claimStatus: "UNCLAIMED",
      paymentState: "FREE_TRIAL_ACTIVE",
      contactEmail: "dan@demo.1mileaway.com",
      phoneDisplay: "Ask to claim",
      about: "Independent plumber. This listing is waiting to be claimed after a real customer enquiry.",
      ratingAvg: 0,
      ratingCount: 0,
      answerRate: 0,
      professions: { create: { professionId: plumber.id } },
      locations: { create: [{ locationId: catford.id, radiusMiles: 3 }] },
      availability: { create: { status: "UNKNOWN", source: "seed" } },
      trackingNumbers: { create: { number: "SIM-RUSHEY" } },
    },
  });

  await prisma.setting.createMany({
    data: [
      { key: "default_trial_leads", value: "5" },
      { key: "qualified_call_seconds", value: "45" },
    ],
  });

  await prisma.auditLog.create({
    data: {
      actorId: admin.id,
      action: "seed.complete",
      entityType: "system",
      metadata: JSON.stringify({ hash: createHash("sha256").update("seed").digest("hex").slice(0, 8) }),
    },
  });

  console.log("Seeded 1mileaway marketplace");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
