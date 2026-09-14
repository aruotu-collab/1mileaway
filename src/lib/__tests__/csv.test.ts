import { describe, expect, it } from "vitest";
import { parseListingCsv, splitCsvLine } from "@/lib/listings/csv";

describe("listing CSV", () => {
  it("splits quoted commas", () => {
    expect(splitCsvLine('Smith Plumbing,"hello, team@smith.com",plumber')).toEqual([
      "Smith Plumbing",
      "hello, team@smith.com",
      "plumber",
    ]);
  });

  it("parses a lawful import file", () => {
    const rows = parseListingCsv(`name,email,profession,location,source
Smith Plumbing,hello@smith.test,plumber,catford,trade-show
Jones Heating,,heating,lewisham,partner
`);
    expect(rows).toHaveLength(2);
    expect(rows[0].email).toBe("hello@smith.test");
    expect(rows[0].source).toBe("trade-show");
    expect(rows[1].email).toBe("");
    expect(rows[1].profession).toBe("heating");
  });
});
