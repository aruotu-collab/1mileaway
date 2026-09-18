import { CLAIM_STATUS } from "@/lib/constants";
import { isSubscriptionActive } from "@/lib/subscription";

export function publicCallPhone(input: {
  claimStatus: string;
  paymentState?: string;
  phoneReal?: string | null;
  currentPeriodEnd?: Date | null;
}) {
  if (input.claimStatus !== CLAIM_STATUS.CLAIMED && input.claimStatus !== CLAIM_STATUS.VERIFIED) {
    return null;
  }
  if (!isSubscriptionActive(input.paymentState ?? "", input.currentPeriodEnd)) return null;
  const phone = input.phoneReal?.trim();
  return phone || null;
}

export function toTelHref(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : null;
}

export function canRequestTradesman(input: {
  claimStatus: string;
  contactEmail?: string | null;
}) {
  if (input.claimStatus === CLAIM_STATUS.UNCLAIMED) return Boolean(input.contactEmail);
  return input.claimStatus === CLAIM_STATUS.CLAIMED || input.claimStatus === CLAIM_STATUS.VERIFIED;
}

export function listingCallOptions(input: {
  claimStatus: string;
  paymentState?: string;
  phoneReal?: string | null;
  contactEmail?: string | null;
  currentPeriodEnd?: Date | null;
  subscription?: { currentPeriodEnd?: Date | null } | null;
}) {
  const currentPeriodEnd = input.currentPeriodEnd ?? input.subscription?.currentPeriodEnd ?? null;
  const phone = publicCallPhone({ ...input, currentPeriodEnd });
  return {
    phone,
    canRequest: !phone && canRequestTradesman(input),
  };
}
