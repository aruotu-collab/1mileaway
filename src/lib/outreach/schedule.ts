import { OUTREACH, OUTREACH_DAY_MS } from "@/lib/constants";

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * OUTREACH_DAY_MS);
}

export function nextOutreachAfterSend(currentStep: number, now = new Date()) {
  if (currentStep <= 0) {
    return { status: OUTREACH.INVITE_SENT, step: 1, nextAt: addDays(now, 3) };
  }
  if (currentStep === 1) {
    return { status: OUTREACH.FOLLOWUP_1, step: 2, nextAt: addDays(now, 5) };
  }
  return { status: OUTREACH.COMPLETE, step: 3, nextAt: null as Date | null };
}

export function shouldSendSequence(status: string) {
  return (
    status === OUTREACH.ELIGIBLE ||
    status === OUTREACH.INVITE_SENT ||
    status === OUTREACH.FOLLOWUP_1
  );
}

export function sequenceBlocked(status: string) {
  return (
    status === OUTREACH.UNSUBSCRIBED ||
    status === OUTREACH.BOUNCED ||
    status === OUTREACH.DO_NOT_CONTACT ||
    status === OUTREACH.COMPLETE
  );
}
