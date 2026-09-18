"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { parseProfessionIds } from "@/lib/professions";
import { replaceBusinessProfessions } from "@/lib/listings/professions";
import { normalizeListingPhone } from "@/lib/phone";

async function ownedBusinessId() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/join");
  return { user, businessId: link.businessId };
}

export async function updateListingPhone(formData: FormData) {
  const { businessId } = await ownedBusinessId();
  const phoneRaw = String(formData.get("phone") ?? "").trim();
  const business = await prisma.business.findUniqueOrThrow({
    where: { id: businessId },
    include: { country: true },
  });
  const phone = normalizeListingPhone(phoneRaw, business.country.iso2);
  if (!phone) redirect("/professional?error=phone");
  await prisma.business.update({
    where: { id: businessId },
    data: { phoneReal: phone.phoneReal, phoneDisplay: phone.phoneDisplay },
  });
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}

export async function updateListingProfessions(formData: FormData) {
  const { businessId } = await ownedBusinessId();
  const professionIds = parseProfessionIds(formData.getAll("professionId"));
  if (!professionIds.length) redirect("/professional?error=trades");
  const saved = await replaceBusinessProfessions(businessId, professionIds);
  if (!saved) redirect("/professional?error=trades");
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}

export async function updateListingAbout(formData: FormData) {
  const { businessId } = await ownedBusinessId();
  const about = String(formData.get("about") ?? "").trim();
  await prisma.business.update({
    where: { id: businessId },
    data: { about: about || null },
  });
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}
