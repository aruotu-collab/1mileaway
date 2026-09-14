import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth/session";

const links = [
  ["/admin", "Overview"],
  ["/admin/professionals", "Professionals"],
  ["/admin/leads", "Leads"],
  ["/admin/calls", "Calls"],
  ["/admin/payments", "Payments"],
  ["/admin/trials", "Trials"],
  ["/admin/countries", "Countries"],
  ["/admin/emails", "Emails"],
  ["/admin/outreach", "Outreach"],
  ["/admin/audit", "Audit"],
  ["/admin/settings", "Settings"],
] as const;

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !isAdmin(user.role)) redirect("/login?next=/admin");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row">
      <aside className="lg:w-52">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Control centre</p>
        <nav className="mt-3 grid gap-1 text-sm">
          {links.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-2 py-1.5 hover:bg-paper-strong">
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
