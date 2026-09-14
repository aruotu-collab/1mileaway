import { redirect } from "next/navigation";
import { AdminTabs } from "@/components/admin-tabs";
import { getSession, isAdmin } from "@/lib/auth/session";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession();
  if (!user || !isAdmin(user.role)) redirect("/login?next=/admin");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6">
      <AdminTabs />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
