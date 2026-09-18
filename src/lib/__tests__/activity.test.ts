import { describe, expect, it } from "vitest";
import { activityHeadlines, siteActivityHeadlines, tradeClaimHeadline } from "@/lib/activity";

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

const siteBase = {
  callsLastHour: 0,
  callsToday: 0,
  callsAllTime: 0,
  lastCallAt: null,
  asksToday: 0,
  unclaimedAsksToday: 0,
  unclaimedAsksAllTime: 0,
  availableNow: 0,
  listingCount: 12,
  claimedCount: 3,
  unclaimedCount: 9,
  callNowOnCount: 0,
  verifiedCount: 0,
  trialCount: 0,
  listedThisWeek: 0,
  reviewCount: 0,
  areaCount: 6,
  professionCount: 32,
  trades: [
    { name: "Plumber", plural: "Plumbers", claimed: 2, unclaimed: 7 },
    { name: "Hairdresser", plural: "Hairdressers", claimed: 0, unclaimed: 4 },
    { name: "Locksmith", plural: "Locksmiths", claimed: 3, unclaimed: 0 },
  ],
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

describe("siteActivityHeadlines", () => {
  it("keeps the site-wide tape honest when there are no calls yet", () => {
    const lines = siteActivityHeadlines(siteBase);
    expect(lines.some((line) => /ringing/i.test(line))).toBe(false);
    expect(lines).toContain("3 claimed listings · 9 listings not yet claimed");
    expect(lines).toContain("32 types of help nearby");
    expect(lines).toContain("6 areas you can search");
  });

  it("shows claimed vs unclaimed for each trade", () => {
    const lines = siteActivityHeadlines(siteBase);
    expect(lines).toContain("2 claimed plumbers · 7 not yet claimed");
    expect(lines).toContain("4 hairdressers listed — none claimed yet, so Call now is off");
    expect(lines).toContain("3 claimed locksmiths with Call now on");
  });

  it("puts unclaimed customer asks in language that makes claiming urgent", () => {
    const lines = siteActivityHeadlines({
      ...siteBase,
      unclaimedAsksToday: 3,
      unclaimedAsksAllTime: 41,
    });
    expect(lines).toContain("3 customers asked unclaimed listings today — they could not get through");
    expect(lines).toContain("41 customers have asked unclaimed listings and could not tap Call now");
  });

  it("shows Call now on and new listings only from real counts", () => {
    const lines = siteActivityHeadlines({
      ...siteBase,
      callNowOnCount: 2,
      listedThisWeek: 1,
    });
    expect(lines).toContain("2 listings have Call now on");
    expect(lines).toContain("1 new listing this week");
  });
});

describe("tradeClaimHeadline", () => {
  it("uses the singular trade name when the count is one", () => {
    expect(tradeClaimHeadline({ name: "Electrician", plural: "Electricians", claimed: 1, unclaimed: 0 })).toBe(
      "1 claimed electrician with Call now on",
    );
    expect(tradeClaimHeadline({ name: "Heating engineer", plural: "Heating engineers", claimed: 0, unclaimed: 1 })).toBe(
      "1 heating engineer listed — none claimed yet, so Call now is off",
    );
  });

  it("returns nothing when a trade has no listings", () => {
    expect(tradeClaimHeadline({ name: "Tutor", plural: "Tutors", claimed: 0, unclaimed: 0 })).toBeNull();
  });
});
