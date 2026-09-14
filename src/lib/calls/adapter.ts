import { prisma } from "@/lib/db";
import { APP_URL } from "@/lib/constants";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/adapter";
import { publicCallPhone } from "@/lib/phone";

export async function startDirectCall(input: {
  businessId: string;
  professionId?: string;
  locationId?: string;
}) {
  const business = await prisma.business.findUnique({
    where: { id: input.businessId },
    include: { users: { include: { profile: true } } },
  });
  if (!business) throw new Error("Business not found");

  const phone = publicCallPhone(business);
  if (!phone) {
    return { call: null, reason: "no_direct_number" as const };
  }

  const call = await prisma.call.create({
    data: {
      businessId: input.businessId,
      toNumber: phone,
      status: "dialling",
      events: { create: { type: "direct_dial" } },
    },
  });

  const profession =
    input.professionId ??
    (await prisma.businessProfession.findFirst({ where: { businessId: input.businessId } }))?.professionId;

  if (profession) {
    await prisma.lead.create({
      data: {
        businessId: input.businessId,
        countryId: business.countryId,
        professionId: profession,
        locationId: input.locationId,
        callId: call.id,
        status: "CREATED",
      },
    });
  }

  await writeAudit({
    action: "call.started",
    entityType: "call",
    entityId: call.id,
    metadata: { businessId: input.businessId, mode: "direct" },
  });

  const owner = business.users[0]?.profile;
  if (owner) {
    await sendEmail({
      to: owner.email,
      businessId: business.id,
      template: "inbound_call",
      subject: "A customer is calling you from 1mileaway",
      html: `<p>Someone nearby just tapped Call now. Their phone is ringing <strong>${business.name}</strong> on ${phone}.</p>
        <p>If it was a real job, confirm it from your leads page. Missed or wrong-number calls do not use your free trial.</p>
        <p><a href="${APP_URL}/professional/leads">Confirm this lead</a></p>`,
    });
  }

  return { call, reason: null };
}
