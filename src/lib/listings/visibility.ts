import { CLAIM_STATUS } from "@/lib/constants";
import type { Prisma } from "@prisma/client";

function filled(value?: string | null) {
  return Boolean(value?.trim());
}

export function hasReachableContact(input: {
  contactEmail?: string | null;
  phoneReal?: string | null;
  phoneDisplay?: string | null;
}) {
  return filled(input.contactEmail) || filled(input.phoneReal) || filled(input.phoneDisplay);
}

export function isPublicListing(input: {
  claimStatus: string;
  deletedAt?: Date | null;
  contactEmail?: string | null;
  phoneReal?: string | null;
  phoneDisplay?: string | null;
}) {
  if (input.deletedAt) return false;
  if (input.claimStatus === CLAIM_STATUS.SUSPENDED) return false;
  if (input.claimStatus === CLAIM_STATUS.UNCLAIMED) return hasReachableContact(input);
  return true;
}

/** Unclaimed listings with no email and no phone stay out of search. */
export const publicListingWhere: Prisma.BusinessWhereInput = {
  deletedAt: null,
  claimStatus: { not: CLAIM_STATUS.SUSPENDED },
  NOT: {
    claimStatus: CLAIM_STATUS.UNCLAIMED,
    AND: [
      { OR: [{ contactEmail: null }, { contactEmail: "" }] },
      { OR: [{ phoneReal: null }, { phoneReal: "" }] },
      { OR: [{ phoneDisplay: null }, { phoneDisplay: "" }] },
    ],
  },
};

export const unreachableUnclaimedWhere: Prisma.BusinessWhereInput = {
  deletedAt: null,
  claimStatus: CLAIM_STATUS.UNCLAIMED,
  AND: [
    { OR: [{ contactEmail: null }, { contactEmail: "" }] },
    { OR: [{ phoneReal: null }, { phoneReal: "" }] },
    { OR: [{ phoneDisplay: null }, { phoneDisplay: "" }] },
  ],
};
