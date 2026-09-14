import { prisma } from "@/lib/db";

export default async function AdminAuditPage() {
  const logs = await prisma.auditLog.findMany({
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  return (
    <main>
      <h1 className="serif text-4xl">Audit</h1>
      <ul className="mt-6 grid gap-2">
        {logs.map((log) => (
          <li key={log.id} className="card p-4 text-sm">
            {log.createdAt.toISOString()} · {log.action} · {log.entityType} · {log.actor?.email ?? "system"}
          </li>
        ))}
      </ul>
    </main>
  );
}
