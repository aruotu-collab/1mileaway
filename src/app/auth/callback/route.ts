import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DAYS } from "@/lib/constants";
import { upsertProfile } from "@/lib/auth/session";
import { writeAudit } from "@/lib/admin/audit";
import { hashToken, randomToken, safeNextPath } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (!token) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }

  const row = await prisma.magicLink.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!row || row.usedAt || row.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired", request.url));
  }

  await prisma.magicLink.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  const profile = await upsertProfile(row.email);
  const sessionToken = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { profileId: profile.id, tokenHash: hashToken(sessionToken), expiresAt },
  });
  await writeAudit({
    actorId: profile.id,
    action: "auth.login",
    entityType: "profile",
    entityId: profile.id,
  });

  const response = NextResponse.redirect(new URL(next, request.url));
  response.cookies.set(SESSION_COOKIE, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return response;
}
