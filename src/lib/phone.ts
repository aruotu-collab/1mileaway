import { CLAIM_STATUS } from "@/lib/constants";

export function publicCallPhone(input: { claimStatus: string; phoneReal?: string | null }) {
  if (input.claimStatus !== CLAIM_STATUS.CLAIMED && input.claimStatus !== CLAIM_STATUS.VERIFIED) {
    return null;
  }
  const phone = input.phoneReal?.trim();
  return phone || null;
}

export function toTelHref(phone: string) {
  const compact = phone.replace(/[^\d+]/g, "");
  return compact ? `tel:${compact}` : null;
}
