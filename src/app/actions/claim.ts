"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { completeClaim, inviteUnclaimedBusiness, activateClaimedListing } from "@/lib/claim/invite";
import { writeAudit } from "@/lib/admin/audit";
import { prisma } from "@/lib/db";
import { CLAIM_STATUS } from "@/lib/constants";
import { requestMagicLink } from "@/app/actions/auth";
import { claimCompletePath, parseProfessionIds } from "@/lib/professions";

export async function requestClaimLink(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const professionIds = parseProfessionIds(formData.getAll("professionId"));
  if (!token) redirect("/join");
  if (!professionIds.length) redirect(`/claim/${token}?error=trades`);
  formData.set("next", claimCompletePath(token, professionIds));
  formData.set("sentRedirect", `/claim/${token}?sent=1&professions=${encodeURIComponent(professionIds.join(","))}`);
  await requestMagicLink(formData);
}

export async function finishClaim(formData: FormData) {
  const token = String(formData.get("token") ?? "");
  const professionIds = parseProfessionIds(formData.getAll("professionId"));
  const user = await getSession();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(claimCompletePath(token, professionIds))}`);
  }
  try {
    await completeClaim({ token, profileId: user.id, email: user.email, professionIds });
  } catch {
    redirect(`/claim/${token}?error=claim`);
  }
  redirect("/professional?claimed=1");
}

export async function claimMatchingListing() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional");
  const business = await prisma.business.findFirst({
    where: {
      contactEmail: user.email.toLowerCase(),
      claimStatus: CLAIM_STATUS.UNCLAIMED,
      deletedAt: null,
      users: { none: {} },
    },
    orderBy: { createdAt: "desc" },
  });
  if (!business) redirect("/join");
  await activateClaimedListing({ businessId: business.id, profileId: user.id });
  await writeAudit({
    actorId: user.id,
    action: "claim.completed",
    entityType: "business",
    entityId: business.id,
    metadata: { source: "matching_email" },
  });
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
