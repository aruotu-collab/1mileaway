import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/utils";

export default async function AdminLeadsPage() {
  const leads = await prisma.lead.findMany({
    include: { business: true, location: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return (
    <main>
      <h1 className="serif text-4xl">Leads</h1>
      <ul className="mt-6 grid gap-3">
        {leads.map((lead) => (
          <li key={lead.id} className="card p-4 text-sm">
            <p className="font-semibold">{lead.business.name}</p>
            <p className="text-ink-soft">
              {lead.status} · {lead.qualification ?? "—"} · {lead.chargingMode ?? "—"} · {lead.location?.name ?? "—"}
              {lead.priceMinor && lead.currency ? ` · ${formatMoney(lead.priceMinor, lead.currency)}` : ""}
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
