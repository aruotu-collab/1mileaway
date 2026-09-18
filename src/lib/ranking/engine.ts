import { AVAILABILITY, CLAIM_STATUS, PAYMENT_STATES } from "@/lib/constants";
import { isAvailabilityLive } from "@/lib/availability/engine";
import { rankingAnswerScore } from "@/lib/reputation";

export type Rankable = {
  id: string;
  name: string;
  distanceMiles: number | null;
  availabilityStatus: string;
  availabilityExpiresAt: Date | null;
  availabilityConfirmedAt: Date | null;
  answerRate: number;
  answerReports?: number;
  ratingAvg: number;
  ratingCount: number;
  claimStatus: string;
  paymentState: string;
  sponsoredUntil: Date | null;
  rankingBoost: number;
  rankingBoostUntil: Date | null;
  about?: string | null;
  photoUrl?: string | null;
};

export type Ranked<T extends Rankable> = T & {
  score: number;
  sponsored: boolean;
  explanation: Record<string, number>;
};

function clamp(n: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, n));
}

export function rankListings<T extends Rankable>(items: T[], now = new Date()): Ranked<T>[] {
  return items
    .map((item) => {
      const status = isAvailabilityLive(item.availabilityStatus, item.availabilityExpiresAt, now);
      const availability =
        status === AVAILABILITY.AVAILABLE_NOW
          ? 1
          : status === AVAILABILITY.AVAILABLE_TODAY
            ? 0.72
            : status === AVAILABILITY.AVAILABLE_LATER
              ? 0.4
              : status === AVAILABILITY.LIMITED
                ? 0.35
                : 0.08;

      const miles = item.distanceMiles ?? 99;
      const distance = miles <= 1 ? 1 : miles <= 3 ? 0.78 : miles <= 8 ? 0.45 : 0.2;

      const answer = rankingAnswerScore(item.answerRate, item.answerReports);
      const rating = item.ratingCount > 0 ? clamp(item.ratingAvg / 5) : 0.35;
      const verified = item.claimStatus === CLAIM_STATUS.VERIFIED ? 1 : item.claimStatus === CLAIM_STATUS.CLAIMED ? 0.55 : 0.2;
      const quality = clamp((item.about ? 0.5 : 0.2) + (item.photoUrl ? 0.5 : 0.15));
      const reliability =
        item.paymentState === PAYMENT_STATES.SUBSCRIPTION_ACTIVE ||
        item.paymentState === PAYMENT_STATES.SUBSCRIPTION_TRIALING
          ? 0.9
          : 0.35;
      const sponsored = Boolean(item.sponsoredUntil && item.sponsoredUntil > now);
      const override = item.rankingBoostUntil && item.rankingBoostUntil > now ? item.rankingBoost : 0;

      const explanation = {
        availability,
        distance,
        answer,
        rating,
        verified,
        quality,
        reliability,
        sponsored: sponsored ? 1 : 0,
        override,
      };

      const score =
        availability * 0.28 +
        distance * 0.22 +
        answer * 0.12 +
        rating * 0.1 +
        verified * 0.08 +
        quality * 0.06 +
        reliability * 0.08 +
        (sponsored ? 0.12 : 0) +
        override;

      return { ...item, score, sponsored, explanation };
    })
    .sort((a, b) => b.score - a.score || (a.distanceMiles ?? 99) - (b.distanceMiles ?? 99) || a.name.localeCompare(b.name));
}
