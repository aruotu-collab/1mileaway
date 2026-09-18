"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession, isAdmin } from "@/lib/auth/session";
import { writeAudit } from "@/lib/admin/audit";
import { sendEmail } from "@/lib/email/adapter";
import { SUPER_ADMIN_EMAILS, APP_URL } from "@/lib/constants";
import { cleanContactField, contactReplyHtml, escapeHtml, isValidContactEmail, normalizeContactEmail } from "@/lib/contact";

export async function sendContactMessage(formData: FormData) {
  const user = await getSession();
  const name = cleanContactField(String(formData.get("name") ?? user?.name ?? ""), 80);
  const email = normalizeContactEmail(String(formData.get("email") ?? user?.email ?? ""));
  const subject = cleanContactField(String(formData.get("subject") ?? ""), 120);
  const body = cleanContactField(String(formData.get("body") ?? ""), 5000);
  if (!name || !isValidContactEmail(email) || !subject || body.length < 10) {
    redirect("/contact?error=1");
  }

  const recent = await prisma.contactMessage.count({
    where: {
      authorKind: "visitor",
      createdAt: { gte: new Date(Date.now() - 10 * 60 * 1000) },
      thread: { email },
    },
  });
  if (recent >= 3) redirect("/contact?error=rate");

  const thread = await prisma.contactThread.create({
    data: {
      email,
      name,
      subject,
      profileId: user?.id ?? null,
      messages: { create: { authorKind: "visitor", authorId: user?.id ?? null, body } },
    },
  });

  for (const adminEmail of SUPER_ADMIN_EMAILS) {
    await sendEmail({
      to: adminEmail,
      template: "contact_received",
      subject: `Contact us: ${subject}`,
      html: `<p>${escapeHtml(name)} (${escapeHtml(email)}) wrote:</p><p>${escapeHtml(body)}</p>
        <p><a href="${APP_URL}/admin/contact/${thread.id}">Open in admin</a></p>`,
    });
  }

  redirect("/contact?sent=1");
}

async function requireAdmin() {
  const user = await getSession();
  if (!user || !isAdmin(user.role)) redirect("/login?next=/admin/contact");
  return user;
}

export async function replyToContact(formData: FormData) {
  const user = await requireAdmin();
  const threadId = String(formData.get("threadId") ?? "");
  const body = cleanContactField(String(formData.get("body") ?? ""), 5000);
  const thread = await prisma.contactThread.findUnique({ where: { id: threadId } });
  if (!thread || body.length < 2) redirect("/admin/contact");

  await prisma.$transaction([
    prisma.contactMessage.create({
      data: { threadId, authorKind: "admin", authorId: user.id, body },
    }),
    prisma.contactThread.update({
      where: { id: threadId },
      data: { status: "open" },
    }),
  ]);

  await sendEmail({
    to: thread.email,
    template: "contact_reply",
    subject: `Re: ${thread.subject}`,
    html: contactReplyHtml({ name: thread.name, body }),
  });
  await writeAudit({
    actorId: user.id,
    action: "contact.reply",
    entityType: "contact_thread",
    entityId: threadId,
    metadata: { email: thread.email },
  });
  revalidatePath(`/admin/contact/${threadId}`);
  redirect(`/admin/contact/${threadId}?sent=1`);
}

export async function closeContactThread(formData: FormData) {
  const user = await requireAdmin();
  const threadId = String(formData.get("threadId") ?? "");
  await prisma.contactThread.update({
    where: { id: threadId },
    data: { status: "closed" },
  });
  await writeAudit({
    actorId: user.id,
    action: "contact.close",
    entityType: "contact_thread",
    entityId: threadId,
  });
  revalidatePath("/admin/contact");
  redirect("/admin/contact");
}
