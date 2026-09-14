"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { completeClaim, inviteUnclaimedBusiness } from "@/lib/claim/invite";
import { prisma } from "@/lib/db";
import { CLAIM_STATUS } from "@/lib/constants";

export async function finishClaim(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const user = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/claim/complete?token=${token}`)}`);
  }
  try {
    await completeClaim({ token, profileId: user.id, email: user.email });
  } catch {
    redirect(`/claim/${token}?error=claim`);
  }
  redirect("/professional?claimed=1");
}

export async function requestProfileClaim(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const country = String(formData.get("country") ?? "gb");
  const slug = String(formData.get("slug") ?? "");
  const from = String(formData.get("from") ?? "");
  const typedEmail = String(formData.get("email") ?? "").trim().toLowerCase();
  const back = `/${country}/p/${slug}${from ? `?from=${encodeURIComponent(from)}` : ""}`;
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    include: {
      locations: true,
      professions: true,
    },
  });
  if (!business || business.deletedAt || business.claimStatus !== CLAIM_STATUS.UNCLAIMED) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}claimError=gone`);
  }

  if (!business.contactEmail) {
    if (!typedEmail.includes("@")) {
      redirect(`${back}${back.includes("?") ? "&" : "?"}claimError=email`);
    }
    await prisma.business.update({
      where: { id: business.id },
      data: { contactEmail: typedEmail, contactEmailSource: "owner_request" },
    });
  }

  await inviteUnclaimedBusiness({
    businessId: business.id,
    locationId: business.locations[0]?.locationId,
    professionId: business.professions[0]?.professionId,
    source: "claim_page",
  });
  redirect(`${back}${back.includes("?") ? "&" : "?"}claimSent=1`);
}
