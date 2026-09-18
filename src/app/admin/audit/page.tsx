import { prisma } from "@/lib/db";
import { formatLocalDateTime } from "@/lib/utils";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <main>
      <h1 className="serif text-4xl">Audit</h1>
      <p className="mt-2 text-ink-soft">Admin actions, claims, call outcomes, and reviews.</p>
      {logs.length === 0 ? (
        <p className="card mt-6 p-5 text-ink-soft">No audit events yet.</p>
      ) : (
        <ul className="mt-6 grid gap-2">
          {logs.map((log) => (
            <li key={log.id} className="card p-4 text-sm">
              <p className="font-semibold">{log.action}</p>
              <p className="mt-1 text-ink-soft">
                {formatLocalDateTime(log.createdAt)} · {log.entityType}
                {log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""} · {log.actor?.email ?? "system"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
