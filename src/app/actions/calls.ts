"use server";

import { redirect } from "next/navigation";
import { startTrackedCall, completeTrackedCall } from "@/lib/calls/adapter";
import { trackEvent } from "@/lib/admin/audit";

export async function startCall(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "");
  const professionId = String(formData.get("professionId") ?? "") || undefined;
  const locationId = String(formData.get("locationId") ?? "") || undefined;
  const country = String(formData.get("country") ?? "gb");
  if (!businessId) redirect("/");
  const call = await startTrackedCall({ businessId, professionId, locationId });
  await trackEvent("call_started", `/${country}`, { businessId, callId: call.id });
  redirect(`/call/${call.id}`);
}

export async function finishCall(formData: FormData) {
  const callId = String(formData.get("callId") ?? "");
  const durationSeconds = Number(formData.get("durationSeconds") ?? 0);
  await completeTrackedCall(callId, durationSeconds);
  redirect(`/call/${callId}?done=1`);
}
