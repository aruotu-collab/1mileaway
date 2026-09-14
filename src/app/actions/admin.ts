"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/lib/admin/audit";
import { ROLES } from "@/lib/constants";

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdmin(user.role)) redirect("/login?next=/admin");
  return user;
}

export async function toggleCountry(formData: FormData) {
  const user = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const country = await prisma.country.findUnique({ where: { id } });
  if (!country) redirect("/admin/countries");
  await prisma.country.update({ where: { id }, data: { active: !country.active } });
  await writeAudit({
    actorId: user.id,
    action: "country.toggle",
    entityType: "country",
    entityId: id,
    metadata: { active: !country.active },
  });
  revalidatePath("/admin/countries");
  redirect("/admin/countries");
}

export async function updateTrialDefault(formData: FormData) {
  const user = await requireAdmin();
  const freeLeads = Number(formData.get("freeLeads") ?? 5);
  await prisma.trialConfig.updateMany({
    where: { scope: "global" },
    data: { freeLeads },
  });
  await prisma.setting.upsert({
    where: { key: "default_trial_leads" },
    create: { key: "default_trial_leads", value: String(freeLeads) },
    update: { value: String(freeLeads) },
  });
  await writeAudit({
    actorId: user.id,
    action: "settings.trial",
    entityType: "setting",
    metadata: { freeLeads },
  });
  redirect("/admin/settings");
}

export async function grantSuperAdmin(formData: FormData) {
  const user = await requireAdmin();
  if (user.role !== ROLES.super_admin) redirect("/admin");
  const email = String(formData.get("email") ?? "").toLowerCase();
  await prisma.profile.updateMany({ where: { email }, data: { role: ROLES.super_admin } });
  await writeAudit({
    actorId: user.id,
    action: "role.super_admin",
    entityType: "profile",
    metadata: { email },
  });
  redirect("/admin/settings");
}

export async function createUnclaimedListing(formData: FormData) {
  const user = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const professionId = String(formData.get("professionId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const provenance = String(formData.get("source") ?? "admin").trim() || "admin";
  if (!name || !email.includes("@") || !professionId || !locationId) {
    redirect("/admin/professionals");
  }
  const { createUnclaimedListingRecord } = await import("@/lib/listings/create");
  const { inviteUnclaimedBusiness } = await import("@/lib/claim/invite");
  const result = await createUnclaimedListingRecord({
    name,
    email,
    professionId,
    locationId,
    about: "Added by admin from a lawful contact.",
    contactEmailSource: "admin",
    dataProvenance: provenance,
    availabilitySource: "admin",
  });
  if (result.created) {
    await inviteUnclaimedBusiness({ businessId: result.business.id, locationId, professionId, source: "self" });
    await writeAudit({
      actorId: user.id,
      action: "listing.unclaimed_created",
      entityType: "business",
      entityId: result.business.id,
      metadata: { provenance },
    });
  }
  redirect("/admin/professionals");
}

export async function importListingsCsv(formData: FormData) {
  const user = await requireAdmin();
  const file = formData.get("file");
  const defaultSource = String(formData.get("source") ?? "csv").trim() || "csv";
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/professionals?importError=file");
  }
  if (file.size > 200_000) {
    redirect("/admin/professionals?importError=size");
  }
  const { parseListingCsv } = await import("@/lib/listings/csv");
  const { createUnclaimedListingRecord, resolveLocationKey, resolveProfessionKey } = await import(
    "@/lib/listings/create"
  );
  const { inviteUnclaimedBusiness } = await import("@/lib/claim/invite");
  const rows = parseListingCsv(await file.text());
  if (rows.length === 0 || rows.length > 200) {
    redirect("/admin/professionals?importError=rows");
  }

  let created = 0;
  let invited = 0;
  let skipped = 0;
  let invalid = 0;

  for (const row of rows) {
    if (!row.name || !row.profession || !row.location) {
      invalid += 1;
      continue;
    }
    const profession = await resolveProfessionKey(row.profession);
    const location = await resolveLocationKey(row.location, row.country || "gb");
    if (!profession || !location) {
      invalid += 1;
      continue;
    }
    const email = row.email.includes("@") ? row.email : null;
    const provenance = `csv:${row.source || defaultSource}`;
    const result = await createUnclaimedListingRecord({
      name: row.name,
      email,
      professionId: profession.id,
      locationId: location.id,
      website: row.website || null,
      phone: row.phone || null,
      about: row.about || null,
      contactEmailSource: email ? provenance : null,
      dataProvenance: provenance,
      availabilitySource: "csv",
    });
    if (!result.created) {
      skipped += 1;
      continue;
    }
    created += 1;
    if (email) {
      const invite = await inviteUnclaimedBusiness({
        businessId: result.business.id,
        locationId: location.id,
        professionId: profession.id,
        source: "self",
      });
      if (invite?.claimToken) invited += 1;
    }
  }

  await writeAudit({
    actorId: user.id,
    action: "listing.csv_imported",
    entityType: "business",
    metadata: { created, invited, skipped, invalid, source: defaultSource },
  });
  redirect(
    `/admin/professionals?created=${created}&invited=${invited}&skipped=${skipped}&invalid=${invalid}`,
  );
}
