import { describe, expect, it } from "vitest";
import { countByDay, lastLocalDayKeys, localDateKey } from "@/lib/admin/conversions";

describe("claim conversion days", () => {
  it("buckets a London morning claim onto that local day", () => {
    const claimed = new Date("2026-09-18T08:47:00.000Z");
    expect(localDateKey(claimed)).toBe("2026-09-18");
  });

  it("keeps quiet days in the last two weeks so progress is visible", () => {
    const now = new Date("2026-09-18T12:00:00.000Z");
    const keys = lastLocalDayKeys(14, now);
    expect(keys[0]).toBe("2026-09-18");
    expect(keys).toHaveLength(14);
    const series = countByDay(
      [new Date("2026-09-18T10:00:00.000Z"), new Date("2026-09-16T18:00:00.000Z")],
      keys,
    );
    expect(series[0]?.key).toBe("2026-09-18");
    expect(series[0]?.count).toBe(1);
    expect(series[0]?.label).toMatch(/Fri 18 Sep/);
    expect(series.find((day) => day.key === "2026-09-17")?.count).toBe(0);
    expect(series.find((day) => day.key === "2026-09-16")?.count).toBe(1);
  });
});
