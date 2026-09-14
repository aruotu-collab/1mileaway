"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { AVAILABILITY, type AvailabilityStatus } from "@/lib/constants";
import { getSession } from "@/lib/auth/session";
import { setAvailability } from "@/lib/availability/engine";
import { hashToken } from "@/lib/utils";

async function ownedBusinessId() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/join");
  return { user, businessId: link.businessId };
}

export async function wantWork(formData: FormData) {
  const { user, businessId } = await ownedBusinessId();
  const window = String(formData.get("window") ?? "now");
  const status: AvailabilityStatus =
    window === "today" ? AVAILABILITY.AVAILABLE_TODAY : AVAILABILITY.AVAILABLE_NOW;
  await setAvailability({
    businessId,
    status,
    source: "dashboard_want_work",
    actorId: user.id,
  });
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}

export async function imBusy() {
  const { user, businessId } = await ownedBusinessId();
  await setAvailability({
    businessId,
    status: AVAILABILITY.BUSY,
    source: "dashboard_busy",
    actorId: user.id,
  });
  revalidatePath("/professional");
  redirect("/professional?updated=1");
}

export async function applyAvailabilityToken(token: string, status: string) {
  const row = await prisma.actionToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    redirect("/action/availability?error=expired");
  }
  const allowed = Object.values(AVAILABILITY);
  const nextStatus = allowed.includes(status as AvailabilityStatus)
    ? (status as AvailabilityStatus)
    : AVAILABILITY.UNKNOWN;
  await setAvailability({
    businessId: row.businessId,
    status: nextStatus,
    source: "email_token",
  });
  await prisma.actionToken.update({
    where: { id: row.id },
    data: { usedAt: new Date() },
  });
  redirect("/action/availability?ok=1");
}
