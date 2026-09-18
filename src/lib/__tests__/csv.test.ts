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

  it("maps common spreadsheet headings", () => {
    const rows = parseListingCsv(`Business Name,Trade,Town,Telephone
Kira Plumbing,Plumbing,Catford,020 7946 0101
`);
    expect(rows[0]).toMatchObject({
      name: "Kira Plumbing",
      profession: "Plumbing",
      location: "Catford",
      phone: "020 7946 0101",
    });
  });

  it("prefers city/area over a street address", () => {
    const rows = parseListingCsv(
      `Name,Email,Profession,Location,City/Area,Phone,Website,Source,Country
Catford Drains,,Drainage Engineer,35 Chestnut Close,Catford / Lewisham,020 8106 2374 / 07881 651899,https://example.test,https://www.google.com/maps,United Kingdom
`,
    );
    expect(rows[0]).toMatchObject({
      name: "Catford Drains",
      profession: "Drainage Engineer",
      location: "Catford",
      phone: "020 8106 2374",
      website: "https://example.test",
      source: "",
      country: "gb",
    });
  });
});
