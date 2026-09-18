"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { startDirectCall, requestTradesman } from "@/lib/calls/adapter";
import { qualifyLead, rejectLead } from "@/lib/leads/lifecycle";
import { trackEvent } from "@/lib/admin/audit";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { safeInternalPath, withQuery } from "@/lib/navigation";

export async function startCall(formData: FormData): Promise<{ href: string }> {
  const businessId = String(formData.get("businessId") ?? "");
  const professionId = String(formData.get("professionId") ?? "") || undefined;
  const locationId = String(formData.get("locationId") ?? "") || undefined;
  const country = String(formData.get("country") ?? "gb");
  const returnTo = String(formData.get("returnTo") ?? "");
  const skipBusinessIds = String(formData.get("skip") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!businessId) return { href: "/" };
  const { call, reason } = await startDirectCall({
    businessId,
    professionId,
    locationId,
    skipBusinessIds,
  });
  if (!call) {
    const fallback = safeInternalPath(returnTo, `/${country}`);
    return { href: withQuery(fallback, { callError: reason ?? "no_direct_number" }) };
  }
  await trackEvent("call_started", `/${country}`, { businessId, callId: call.id });
  return { href: `/call/${call.id}` };
}

export async function askTradesman(formData: FormData): Promise<{ href: string }> {
  const businessId = String(formData.get("businessId") ?? "");
  const professionId = String(formData.get("professionId") ?? "") || undefined;
  const locationId = String(formData.get("locationId") ?? "") || undefined;
  const returnTo = String(formData.get("returnTo") ?? "");
  if (!businessId) return { href: "/" };
  await requestTradesman({ businessId, professionId, locationId });
  const fallback = safeInternalPath(returnTo, "/");
  return { href: withQuery(fallback, { asked: "1" }) };
}

async function ownedLead(leadId: string) {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/leads");
  const link = await prisma.businessUser.findFirst({ where: { profileId: user.id } });
  if (!link) redirect("/professional");
  const lead = await prisma.lead.findFirst({ where: { id: leadId, businessId: link.businessId } });
  if (!lead) redirect("/professional/leads");
  return lead;
}

export async function confirmLead(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  await ownedLead(leadId);
  await qualifyLead(leadId);
  revalidatePath("/professional");
  revalidatePath("/professional/leads");
  redirect("/professional/leads?updated=1");
}

export async function markLeadMissed(formData: FormData) {
  const leadId = String(formData.get("leadId") ?? "");
  await ownedLead(leadId);
  await rejectLead(leadId, "MISSED");
  revalidatePath("/professional");
  revalidatePath("/professional/leads");
  redirect("/professional/leads?updated=1");
}
