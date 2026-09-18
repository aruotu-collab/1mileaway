"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { createSession, destroySession, upsertProfile } from "@/lib/auth/session";
import { sendEmail, magicLinkHtml } from "@/lib/email/adapter";
import { hashToken, randomToken, safeNextPath } from "@/lib/utils";
import { writeAudit } from "@/lib/admin/audit";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = safeNextPath(String(formData.get("next") ?? "/professional"));
  if (!email.includes("@")) {
    redirect(`/login?error=invalid-email&next=${encodeURIComponent(next)}`);
  }

  await upsertProfile(email);
  const token = randomToken();
  await prisma.magicLink.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    },
  });

  if (!process.env.RESEND_API_KEY && process.env.DEV_MAGIC_BYPASS === "1") {
    await consumeMagicToken(token, next);
  }

  await sendEmail({
    to: email,
    template: "magic_link",
    subject: "Your 1mileaway sign-in link",
    html: magicLinkHtml(token, next),
    payload: { token: process.env.RESEND_API_KEY ? undefined : token },
  });

  const sent = String(formData.get("sentRedirect") ?? "");
  const sentUrl = sent || `/login?sent=1&next=${encodeURIComponent(next)}&email=${encodeURIComponent(email)}`;
  redirect(sentUrl);
}

export async function consumeMagicToken(token: string, next = "/professional") {
  next = safeNextPath(next);
  const row = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    redirect("/login?error=expired");
  }
  await prisma.magicLink.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const profile = await upsertProfile(row.email);
  await createSession(profile.id);
  await writeAudit({
    actorId: profile.id,
    action: "auth.login",
    entityType: "profile",
    entityId: profile.id,
  });
  redirect(next);
}

export async function signOut() {
  await destroySession();
  redirect("/");
}
