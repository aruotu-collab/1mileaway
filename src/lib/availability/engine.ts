import { prisma } from "@/lib/db";
import { AVAILABILITY, AVAILABLE_NOW_HOURS, type AvailabilityStatus } from "@/lib/constants";
import { endOfLocalDay, formatFreshness } from "@/lib/utils";
import { writeAudit } from "@/lib/admin/audit";
import { isSubscriptionActive } from "@/lib/subscription";

export function isAvailabilityLive(
  status: string,
  expiresAt: Date | null | undefined,
  now = new Date(),
): AvailabilityStatus {
  if (expiresAt && expiresAt < now) return AVAILABILITY.UNKNOWN;
  if (status in AVAILABILITY) return status as AvailabilityStatus;
  return AVAILABILITY.UNKNOWN;
}

export function publicAvailabilityLabel(status: AvailabilityStatus, confirmedAt: Date | null) {
  const freshness = confirmedAt ? ` — ${formatFreshness(confirmedAt)}` : "";
  switch (status) {
    case AVAILABILITY.AVAILABLE_NOW:
      return `Available now${freshness}`;
    case AVAILABILITY.AVAILABLE_TODAY:
      return `Available today${freshness}`;
    case AVAILABILITY.AVAILABLE_LATER:
      return "Available later";
    case AVAILABILITY.LIMITED:
      return "Limited availability";
    case AVAILABILITY.BUSY:
      return "Busy now";
    case AVAILABILITY.NOT_TODAY:
      return "Not available today";
    default:
      return "Availability unknown";
  }
}

export function expiryFor(status: AvailabilityStatus, timeZone: string, now = new Date()) {
  if (status === AVAILABILITY.AVAILABLE_NOW) {
    return new Date(now.getTime() + AVAILABLE_NOW_HOURS * 60 * 60 * 1000);
  }
  if (status === AVAILABILITY.AVAILABLE_TODAY) {
    return endOfLocalDay(timeZone, now);
  }
  return null;
}

export async function setAvailability(input: {
  businessId: string;
  status: AvailabilityStatus;
  source: string;
  actorId?: string;
  timeZone?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: { country: true, subscription: true },
  });
  if (!business) throw new Error("Business not found");

  let status = input.status;
  if (
    !isSubscriptionActive(business.paymentState, business.subscription?.currentPeriodEnd) ||
    business.claimStatus === "SUSPENDED"
  ) {
    if (status === AVAILABILITY.AVAILABLE_NOW) {
      status = AVAILABILITY.UNKNOWN;
    }
  }

  const now = new Date();
  const expiresAt = expiryFor(status, input.timeZone ?? business.country.timezone, now);

  await prisma.$transaction([
    prisma.businessAvailability.upsert({
      where: { businessId: input.businessId },
      create: {
        businessId: input.businessId,
        status,
        confirmedAt: now,
        expiresAt,
        source: input.source,
      },
      update: {
        status,
        confirmedAt: now,
        expiresAt,
        source: input.source,
      },
    }),
    prisma.availabilityHistory.create({
      data: {
        businessId: input.businessId,
        status,
        source: input.source,
      },
    }),
  ]);

  await writeAudit({
    actorId: input.actorId,
    action: "availability.set",
    entityType: "business",
    entityId: input.businessId,
    metadata: { status, source: input.source },
  });

  return { status, expiresAt, confirmedAt: now };
}

export async function expireStaleAvailability(now = new Date()) {
  const stale = await prisma.businessAvailability.findMany({
    where: {
      expiresAt: { lt: now },
      status: { in: [AVAILABILITY.AVAILABLE_NOW, AVAILABILITY.AVAILABLE_TODAY] },
    },
  });
  for (const row of stale) {
    await prisma.businessAvailability.update({
      where: { businessId: row.businessId },
      data: { status: AVAILABILITY.UNKNOWN, expiresAt: null },
    });
  }
  return stale.length;
}
