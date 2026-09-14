import { describe, expect, it } from "vitest";
import { nextOutreachAfterSend, shouldSendSequence, sequenceBlocked } from "@/lib/outreach/schedule";
import { OUTREACH } from "@/lib/constants";

describe("outreach schedule", () => {
  const now = new Date("2026-09-14T12:00:00.000Z");

  it("schedules day 3 after the first invite", () => {
    const next = nextOutreachAfterSend(0, now);
    expect(next.status).toBe(OUTREACH.INVITE_SENT);
    expect(next.step).toBe(1);
    expect(next.nextAt?.toISOString()).toBe("2026-09-17T12:00:00.000Z");
  });

  it("schedules day 8 after the first follow-up", () => {
    const next = nextOutreachAfterSend(1, now);
    expect(next.status).toBe(OUTREACH.FOLLOWUP_1);
    expect(next.step).toBe(2);
    expect(next.nextAt?.toISOString()).toBe("2026-09-19T12:00:00.000Z");
  });

  it("stops after the third email", () => {
    const next = nextOutreachAfterSend(2, now);
    expect(next.status).toBe(OUTREACH.COMPLETE);
    expect(next.step).toBe(3);
    expect(next.nextAt).toBeNull();
    expect(shouldSendSequence(OUTREACH.COMPLETE)).toBe(false);
    expect(sequenceBlocked(OUTREACH.UNSUBSCRIBED)).toBe(true);
  });
});
