import { describe, expect, it } from "vitest";
import { callStatusLabel, claimLabel } from "@/lib/admin/insights";

describe("admin copy", () => {
  it("labels Call now outcomes without inventing duration", () => {
    expect(callStatusLabel("answered")).toBe("Customer said they answered");
    expect(callStatusLabel("no_answer")).toBe("Customer said no answer");
    expect(callStatusLabel("initiated")).toBe("Call now tapped — outcome not reported");
  });

  it("labels claim status for the admin list", () => {
    expect(claimLabel("VERIFIED")).toBe("Verified");
    expect(claimLabel("UNCLAIMED")).toBe("Unclaimed");
  });
});
