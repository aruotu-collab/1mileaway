import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { ADMIN_ROLES, ROLES, SESSION_COOKIE, SESSION_DAYS, SUPER_ADMIN_EMAILS, type Role } from "@/lib/constants";
import { hashToken, randomToken } from "@/lib/utils";

export type SessionUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
};

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { profile: true },
  });
  if (!session || session.expiresAt < new Date() || session.profile.deletedAt) {
    return null;
  }
  return {
    id: session.profile.id,
    email: session.profile.email,
    name: session.profile.name,
    role: session.profile.role as Role,
  };
}

export async function requireUser() {
  const user = await getSession();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}

export async function createSession(profileId: string) {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: {
      profileId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
  }
  jar.delete(SESSION_COOKIE);
}

export function isAdmin(role: Role) {
  return ADMIN_ROLES.includes(role);
}

export function isSuperAdminEmail(email: string) {
  return SUPER_ADMIN_EMAILS.includes(email.toLowerCase());
}

export async function upsertProfile(email: string, name?: string) {
  const normalised = email.trim().toLowerCase();
  const existing = await prisma.profile.findUnique({ where: { email: normalised } });
  const shouldBeSuper = isSuperAdminEmail(normalised);
  if (!existing) {
    return prisma.profile.create({
      data: {
        email: normalised,
        name: name ?? null,
        role: shouldBeSuper ? ROLES.super_admin : ROLES.visitor,
      },
    });
  }
  if (shouldBeSuper && existing.role !== ROLES.super_admin) {
    return prisma.profile.update({
      where: { id: existing.id },
      data: { role: ROLES.super_admin },
    });
  }
  return existing;
}
