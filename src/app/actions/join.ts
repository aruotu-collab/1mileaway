"use server";

import { redirect } from "next/navigation";
import { createUnclaimedListingRecord } from "@/lib/listings/create";
import { inviteUnclaimedBusiness } from "@/lib/claim/invite";
import { parseProfessionIds } from "@/lib/professions";

export async function createOwnListing(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const professionIds = parseProfessionIds(formData.getAll("professionId"));
  const locationId = String(formData.get("locationId") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !email.includes("@") || !professionIds.length || !locationId || !phone) {
    redirect("/join?error=missing");
  }

  const result = await createUnclaimedListingRecord({
    name,
    email,
    professionIds,
    locationId,
    phone,
    phoneReal: phone,
    about: "Added by the professional from join.",
    contactEmailSource: "join",
    dataProvenance: "self_serve",
    availabilitySource: "join",
  });

  const invite = await inviteUnclaimedBusiness({
    businessId: result.business.id,
    locationId,
    professionId: professionIds[0],
    source: "self",
    force: result.created,
  });
  redirect(invite?.claimToken ? `/claim/${invite.claimToken}` : "/join");
}
