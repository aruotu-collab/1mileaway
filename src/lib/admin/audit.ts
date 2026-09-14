import { prisma } from "@/lib/db";

export async function writeAudit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: input.actorId ?? null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    },
  });
}

export async function trackEvent(name: string, path?: string, payload?: unknown) {
  await prisma.analyticsEvent.create({
    data: {
      name,
      path: path ?? null,
      payload: payload ? JSON.stringify(payload) : null,
    },
  });
}
