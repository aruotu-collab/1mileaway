import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { LeadConfirmActions } from "@/components/lead-confirm";

export default async function ProfessionalLeadsPage() {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/leads");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/professional");
  const leads = await prisma.lead.findMany({
    where: { businessId: link.businessId },
    include: { location: true, call: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="serif text-4xl">Leads</h1>
      <p className="mt-2 text-ink-soft">
        Customers call your phone directly. Confirm a real job so the free trial or trust lead is counted. Missed calls
        are free.
      </p>
      <ul className="mt-6 grid gap-3">
        {leads.map((lead) => (
          <li key={lead.id} className="card p-4">
            <p className="font-semibold">{lead.status}</p>
            <p className="text-sm text-ink-soft">
              {lead.qualification ?? "waiting for you"} · {lead.chargingMode ?? "—"} · {lead.location?.name ?? "unknown area"}
              {lead.call?.toNumber ? ` · they rang ${lead.call.toNumber}` : ""}
            </p>
            <LeadConfirmActions leadId={lead.id} status={lead.status} />
          </li>
        ))}
      </ul>
    </main>
  );
}
