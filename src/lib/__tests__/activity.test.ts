import { describe, expect, it } from "vitest";
import { activityHeadlines } from "@/lib/activity";

const base = {
  callsLastHour: 0,
  callsTodayLocal: 0,
  callsTodaySite: 0,
  asksToday: 0,
  availableNow: 0,
  listingCount: 5,
  professionName: "Plumber",
  professionPlural: "Plumbers",
  locationName: "Croydon",
};

describe("activityHeadlines", () => {
  it("never invents live ringing when nobody has called", () => {
    const lines = activityHeadlines(base);
    expect(lines.some((line) => /ringing/i.test(line))).toBe(false);
    expect(lines).toContain("5 plumbers serve Croydon");
  });

  it("reports real Call now taps and who is available", () => {
    const lines = activityHeadlines({
      ...base,
      callsLastHour: 2,
      callsTodayLocal: 4,
      callsTodaySite: 9,
      availableNow: 1,
    });
    expect(lines[0]).toBe("2 customers are ringing tradesmen now");
    expect(lines).toContain("4 Call now taps in Croydon today");
    expect(lines).toContain("9 Call now taps on 1mileaway today");
    expect(lines).toContain("1 plumber recently available in Croydon");
  });
});
