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
  const invite = String(formData.get("invite") ?? "") === "1";
  if (!(file instanceof File) || file.size === 0) {
    redirect("/admin/professionals?importError=file");
  }
  if (file.size > 12_000_000) {
    redirect("/admin/professionals?importError=size");
  }
  const { parseListingSpreadsheet } = await import("@/lib/listings/csv");
  const { importListingRows } = await import("@/lib/listings/import");
  const rows = await parseListingSpreadsheet(Buffer.from(await file.arrayBuffer()), file.name);
  if (rows.length === 0 || rows.length > 50_000) {
    redirect("/admin/professionals?importError=rows");
  }

  const { created, invited, skipped, invalid } = await importListingRows(rows, {
    source: defaultSource,
    invite,
  });

  await writeAudit({
    actorId: user.id,
    action: "listing.csv_imported",
    entityType: "business",
    metadata: { created, invited, skipped, invalid, source: defaultSource, invite, filename: file.name },
  });
  redirect(
    `/admin/professionals?created=${created}&invited=${invited}&skipped=${skipped}&invalid=${invalid}`,
  );
}
