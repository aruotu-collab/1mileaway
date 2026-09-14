import { prisma } from "@/lib/db";
import { updateTrialDefault, grantSuperAdmin } from "@/app/actions/admin";

export default async function AdminSettingsPage() {
  const trial = await prisma.trialConfig.findFirst({ where: { scope: "global" } });
  return (
    <main>
      <h1 className="serif text-4xl">Settings</h1>
      <form action={updateTrialDefault} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Global free qualified leads</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            type="number"
            name="freeLeads"
            defaultValue={trial?.freeLeads ?? 5}
            min={0}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Save trial default
        </button>
      </form>
      <form action={grantSuperAdmin} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Grant super admin</span>
          <input className="w-full rounded-2xl border border-line bg-paper px-4 py-3" type="email" name="email" />
        </label>
        <button className="btn btn-ink" type="submit">
          Grant role
        </button>
      </form>
    </main>
  );
}
