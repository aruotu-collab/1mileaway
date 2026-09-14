"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminTabs() {
  const pathname = usePathname();

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ink-soft">Control centre</p>
      <nav
        role="tablist"
        aria-label="Control centre"
        className="mt-3 flex gap-1 overflow-x-auto rounded-full border border-line bg-paper p-1"
      >
        {links.map(([href, label]) => {
          const selected = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              role="tab"
              aria-selected={selected}
              className={
                selected
                  ? "shrink-0 rounded-full bg-ink px-4 py-2 text-sm font-semibold text-paper-strong"
                  : "shrink-0 rounded-full px-4 py-2 text-sm font-semibold text-ink-soft hover:text-ink"
              }
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
