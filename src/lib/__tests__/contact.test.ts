import { describe, expect, it } from "vitest";
import { isValidContactEmail, normalizeContactEmail, cleanContactField } from "@/lib/contact";

describe("contact email", () => {
  it("accepts a normal address and rejects junk", () => {
    expect(isValidContactEmail("Pat@Example.com ")).toBe(true);
    expect(normalizeContactEmail("Pat@Example.com ")).toBe("pat@example.com");
    expect(isValidContactEmail("not-an-email")).toBe(false);
  });
});

describe("cleanContactField", () => {
  it("trims and caps length", () => {
    expect(cleanContactField("  Hello  ", 80)).toBe("Hello");
    expect(cleanContactField("a".repeat(200), 12)).toHaveLength(12);
  });
});
