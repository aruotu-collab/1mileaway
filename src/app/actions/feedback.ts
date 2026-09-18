"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { CALL_OUTCOME, reportCallOutcome, submitCallReview } from "@/lib/feedback";

function callPath(callId: string) {
  return `/call/${callId}`;
}

export async function reportTheyAnswered(formData: FormData) {
  const callId = String(formData.get("callId") ?? "");
  if (!callId) redirect("/");
  await reportCallOutcome(callId, CALL_OUTCOME.ANSWERED);
  revalidatePath(callPath(callId));
  revalidatePath("/", "layout");
  redirect(`${callPath(callId)}?rated=0`);
}

export async function reportNoAnswer(formData: FormData) {
  const callId = String(formData.get("callId") ?? "");
  if (!callId) redirect("/");
  await reportCallOutcome(callId, CALL_OUTCOME.NO_ANSWER);
  revalidatePath(callPath(callId));
  revalidatePath("/", "layout");
  redirect(`${callPath(callId)}?missed=1`);
}

export async function submitCallFeedback(formData: FormData) {
  const callId = String(formData.get("callId") ?? "");
  const rating = Number(formData.get("rating"));
  const body = String(formData.get("body") ?? "");
  if (!callId || !Number.isFinite(rating)) redirect("/");
  await submitCallReview(callId, rating, body);
  revalidatePath(callPath(callId));
  revalidatePath("/", "layout");
  redirect(`${callPath(callId)}?reviewed=1`);
}
