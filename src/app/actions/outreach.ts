"use server";

import { redirect } from "next/navigation";
import { getSession, isAdmin } from "@/lib/auth/session";
import { processDueOutreach } from "@/lib/outreach/engine";
import { writeAudit } from "@/lib/admin/audit";

export async function runOutreachTick(formData: FormData) {
  const user = await getSession();
  if (!user || !isAdmin(user.role)) redirect("/login?next=/admin/outreach");
  const ignoreSchedule = String(formData.get("ignoreSchedule") ?? "") === "1";
  const result = await processDueOutreach({ ignoreSchedule, limit: 50 });
  await writeAudit({
    actorId: user.id,
    action: "outreach.tick",
    entityType: "system",
    metadata: result,
  });
  redirect(`/admin/outreach?sent=${result.sent}&skipped=${result.skipped}`);
}
