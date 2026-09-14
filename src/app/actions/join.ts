"use server";

import { redirect } from "next/navigation";
import { createUnclaimedListingRecord } from "@/lib/listings/create";
import { inviteUnclaimedBusiness } from "@/lib/claim/invite";

export async function createOwnListing(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const professionId = String(formData.get("professionId") ?? "");
  const locationId = String(formData.get("locationId") ?? "");
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name || !email.includes("@") || !professionId || !locationId || !phone) {
    redirect("/join?error=missing");
  }

  const result = await createUnclaimedListingRecord({
    name,
    email,
    professionId,
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
    professionId,
    source: "self",
    force: result.created,
  });
  redirect(invite?.claimToken ? `/claim/${invite.claimToken}` : "/join");
}
