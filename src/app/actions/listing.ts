"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

async function ownedBusinessId() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/join");
  return { user, businessId: link.businessId };
}

export async function updateListingPhone(formData: FormData) {
  const { businessId } = await ownedBusinessId();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!phone) redirect("/professional?error=phone");
  await prisma.business.update({
    where: { id: businessId },
    data: { phoneReal: phone, phoneDisplay: phone },
  });
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}
