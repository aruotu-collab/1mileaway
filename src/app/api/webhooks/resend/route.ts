import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { suppressEmail } from "@/lib/outreach/engine";

export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as {
    type?: string;
    data?: { email_id?: string; to?: string[] };
  };
  if (body.data?.email_id) {
    const email = await prisma.emailMessage.findFirst({
      where: {
        OR: [
          { payload: { contains: body.data.email_id } },
          { payload: { contains: `"resendId":"${body.data.email_id}"` } },
        ],
      },
    });
    if (email) {
      await prisma.emailEvent.create({
        data: { emailId: email.id, type: body.type ?? "event", payload: JSON.stringify(body) },
      });
      const bounce = (body.type ?? "").toLowerCase().includes("bounce");
      const complaint = (body.type ?? "").toLowerCase().includes("complaint");
      if ((bounce || complaint) && email.toEmail) {
        await suppressEmail({
          email: email.toEmail,
          reason: bounce ? "bounce" : "complaint",
          businessId: email.businessId,
        });
      }
    }
  }
  return NextResponse.json({ received: true });
}
