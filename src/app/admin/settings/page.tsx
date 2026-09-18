import { prisma } from "@/lib/db";
import { grantSuperAdmin } from "@/app/actions/admin";
import { ADMIN_ROLES, SUPER_ADMIN_EMAILS } from "@/lib/constants";
import { TRIAL_MONTHS, subscriptionPriceLabel } from "@/lib/subscription";

export default async function AdminSettingsPage() {
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const admins = await prisma.profile.findMany({
    where: { role: { in: [...ADMIN_ROLES] } },
    orderBy: { email: "asc" },
    select: { email: true, name: true, role: true },
  });

  return (
    <main>
      <h1 className="serif text-4xl">Settings</h1>
      <p className="mt-2 text-ink-soft">
        How 1mileaway sells today: customers ring the professional’s own number, claimed listings get a two-month trial,
        then a monthly fee. No per-lead wallet.
      </p>

      <section className="card mt-6 grid gap-2 p-5 text-sm">
        <p>
          <span className="text-ink-soft">Trial</span> · {TRIAL_MONTHS} months free after claim
        </p>
        <p>
          <span className="text-ink-soft">Then</span> · {subscriptionPriceLabel()} in USD, same price in every country
        </p>
        <p>
          <span className="text-ink-soft">Call now</span> · rings the professional’s own phone, counted in the dashboard
        </p>
        <p>
          <span className="text-ink-soft">Email</span> · {resendConfigured ? "Resend is on" : "Resend is off — local magic links stay on screen"}
        </p>
        <p>
          <span className="text-ink-soft">Super admin emails</span> · {SUPER_ADMIN_EMAILS.join(", ")}
        </p>
      </section>

      <section className="mt-8">
        <h2 className="serif text-2xl">Admins</h2>
        <ul className="mt-4 grid gap-2">
          {admins.map((admin) => (
            <li key={admin.email} className="card p-4 text-sm">
              <p className="font-semibold">{admin.email}</p>
              <p className="text-ink-soft">
                {admin.role.replaceAll("_", " ")}
                {admin.name ? ` · ${admin.name}` : ""}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <form action={grantSuperAdmin} className="card mt-8 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Grant super admin</span>
          <input className="w-full rounded-2xl border border-line bg-paper px-4 py-3" type="email" name="email" required />
        </label>
        <button className="btn btn-ink" type="submit">
          Grant role
        </button>
      </form>
    </main>
  );
}
