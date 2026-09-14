import { AVAILABILITY, type AvailabilityStatus } from "@/lib/constants";
import { formatFreshness } from "@/lib/utils";
import { publicAvailabilityLabel } from "@/lib/availability/engine";

export function AvailabilityBadge({
  status,
  confirmedAt,
}: {
  status: string;
  confirmedAt?: Date | null;
}) {
  const live = status as AvailabilityStatus;
  const label = publicAvailabilityLabel(live, confirmedAt ?? null);
  const now = live === AVAILABILITY.AVAILABLE_NOW;
  const today = live === AVAILABILITY.AVAILABLE_TODAY;
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
        now
          ? "bg-moss/12 text-moss-deep"
          : today
            ? "bg-sand text-ink"
            : "bg-line/50 text-ink-soft"
      }`}
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${now ? "bg-moss" : today ? "bg-rust" : "bg-ink-soft"}`} />
      <span>{label}</span>
    </span>
  );
}

export function Freshness({ date }: { date?: Date | null }) {
  return <span className="text-sm text-ink-soft">{formatFreshness(date)}</span>;
}
