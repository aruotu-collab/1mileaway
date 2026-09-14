import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { qualifyCall } from "@/lib/leads/lifecycle";
import { inviteUnclaimedBusiness } from "@/lib/claim/invite";

export async function startTrackedCall(input: {
  businessId: string;
  fromNumber?: string;
  professionId?: string;
  locationId?: string;
}) {
  const tracking = await prisma.trackingNumber.findFirst({
    where: { businessId: input.businessId, active: true },
  });

  const call = await prisma.call.create({
    data: {
      businessId: input.businessId,
      trackingNumberId: tracking?.id,
      fromNumber: input.fromNumber ?? "+447700900000",
      toNumber: tracking?.number ?? "SIM-TRACK",
      status: "ringing",
      events: { create: { type: "initiated" } },
    },
  });

  const profession =
    input.professionId ??
    (await prisma.businessProfession.findFirst({ where: { businessId: input.businessId } }))?.professionId;

  if (profession) {
    const business = await prisma.business.findUniqueOrThrow({ where: { id: input.businessId } });
    await prisma.lead.create({
      data: {
        businessId: input.businessId,
        countryId: business.countryId,
        professionId: profession,
        locationId: input.locationId,
        callId: call.id,
        visitorPhone: call.fromNumber,
        status: "CREATED",
      },
    });
  }

  await writeAudit({
    action: "call.started",
    entityType: "call",
    entityId: call.id,
    metadata: { businessId: input.businessId },
  });

  await inviteUnclaimedBusiness({
    businessId: input.businessId,
    locationId: input.locationId,
    professionId: profession,
    source: "lead",
  });

  return call;
}

export async function completeTrackedCall(callId: string, durationSeconds: number) {
  const call = await prisma.call.update({
    where: { id: callId },
    data: {
      durationSeconds,
      status: durationSeconds > 0 ? "completed" : "missed",
      endedAt: new Date(),
      events: { create: { type: durationSeconds > 0 ? "completed" : "missed" } },
    },
  });
  const lead = await qualifyCall(call.id);
  return { call, lead };
}
