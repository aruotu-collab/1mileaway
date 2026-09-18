import { CLAIM_STATUS } from "@/lib/constants";
import { callingCodeForCountry } from "@/lib/countries/catalog";
import { isSubscriptionActive } from "@/lib/subscription";

const NANP = new Set(["us", "ca"]);
const KEEP_NATIONAL_ZERO = new Set(["it"]);

function countryDigits(iso2: string) {
  return callingCodeForCountry(iso2).replace(/\D/g, "");
}

export function toE164(raw: string, iso2: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const cc = countryDigits(iso2);
  const hadPlus = trimmed.startsWith("+");
  let digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  if (hadPlus) {
    if (digits.startsWith(cc)) digits = digits.slice(cc.length);
    else if (digits.length >= 8 && digits.length <= 15) return `+${digits}`;
    else return null;
  } else if (digits.startsWith(cc) && digits.length >= cc.length + 8) {
    digits = digits.slice(cc.length);
  }

  if (!KEEP_NATIONAL_ZERO.has(iso2.toLowerCase())) {
    digits = digits.replace(/^0+/, "");
  }
  if (NANP.has(iso2.toLowerCase()) && digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length < 8 || digits.length > 12) return null;
  return `+${cc}${digits}`;
}

export function formatPhoneDisplay(e164: string, iso2: string) {
  const code = callingCodeForCountry(iso2);
  const cc = countryDigits(iso2);
  if (!e164.startsWith(`+${cc}`)) return e164;
  return `${code} ${e164.slice(cc.length + 1)}`;
}

export function nationalNumberForInput(stored: string | null | undefined, iso2: string) {
  if (!stored?.trim()) return "";
  const e164 = toE164(stored, iso2);
  if (!e164) return stored.trim();
  const cc = countryDigits(iso2);
  const national = e164.slice(cc.length + 1);
  if (NANP.has(iso2.toLowerCase()) || KEEP_NATIONAL_ZERO.has(iso2.toLowerCase())) return national;
  return `0${national}`;
}

const PHONE_PLACEHOLDERS: Record<string, string> = {
  gb: "020 7946 0101",
  us: "202 555 0100",
  ca: "416 555 0100",
  au: "0412 345 678",
  ie: "01 234 5678",
  nz: "021 123 4567",
  de: "030 12345678",
  fr: "06 12 34 56 78",
  es: "612 34 56 78",
  it: "06 1234 5678",
  nl: "06 12345678",
  pl: "512 345 678",
  ae: "050 123 4567",
  sa: "050 123 4567",
  za: "082 123 4567",
  in: "98765 43210",
  ph: "0917 123 4567",
  ng: "0803 123 4567",
  mx: "55 1234 5678",
  br: "11 91234 5678",
};

export function phonePlaceholder(iso2: string) {
  return PHONE_PLACEHOLDERS[iso2.toLowerCase()] ?? PHONE_PLACEHOLDERS.gb;
}

export function normalizeListingPhone(raw: string, iso2: string) {
  const phoneReal = toE164(raw, iso2);
  if (!phoneReal) return null;
  return { phoneReal, phoneDisplay: formatPhoneDisplay(phoneReal, iso2) };
}

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

export function phoneDigits(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function toSmsHref(phone: string, body: string) {
  const compact = phone.replace(/[^\d+]/g, "");
  if (!compact) return null;
  return `sms:${compact}?body=${encodeURIComponent(body)}`;
}

export function toWhatsAppHref(phone: string, body: string) {
  const digits = phoneDigits(phone);
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}

export function customerAskMessage(input: { area: string; claimUrl: string }) {
  return `Hi, I found you on 1mileaway. There's a job in ${input.area}. Claim your listing so I can use Call now: ${input.claimUrl}`;
}

export function canRequestTradesman(input: {
  claimStatus: string;
  contactEmail?: string | null;
  phoneReal?: string | null;
  phoneDisplay?: string | null;
}) {
  if (input.claimStatus === CLAIM_STATUS.UNCLAIMED) {
    return Boolean(input.contactEmail?.trim() || input.phoneReal?.trim() || input.phoneDisplay?.trim());
  }
  return input.claimStatus === CLAIM_STATUS.CLAIMED || input.claimStatus === CLAIM_STATUS.VERIFIED;
}

export function listingCallOptions(input: {
  claimStatus: string;
  paymentState?: string;
  phoneReal?: string | null;
  phoneDisplay?: string | null;
  contactEmail?: string | null;
  currentPeriodEnd?: Date | null;
  subscription?: { currentPeriodEnd?: Date | null } | null;
}) {
  const currentPeriodEnd = input.currentPeriodEnd ?? input.subscription?.currentPeriodEnd ?? null;
  const phone = publicCallPhone({ ...input, currentPeriodEnd });
  const askByMessage =
    !phone &&
    input.claimStatus === CLAIM_STATUS.UNCLAIMED &&
    !input.contactEmail?.trim() &&
    Boolean(input.phoneReal?.trim() || input.phoneDisplay?.trim());
  return {
    phone,
    canRequest: !phone && canRequestTradesman(input),
    askByMessage,
  };
}
