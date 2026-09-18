import { describe, expect, it } from "vitest";
import { pickNextCallable, skippedBusinessIdsFromPayload } from "@/lib/calls/next";

describe("pickNextCallable", () => {
  it("returns the first callable listing that has not already been tried", () => {
    const next = pickNextCallable(
      [
        { id: "kira", phone: "020 1" },
        { id: "grant", phone: "020 2" },
        { id: "singh", phone: null },
      ],
      ["kira"],
    );
    expect(next?.id).toBe("grant");
  });

  it("returns null when nobody else can be rung", () => {
    expect(pickNextCallable([{ id: "kira", phone: "020 1" }], ["kira"])).toBeNull();
  });
});

describe("skippedBusinessIdsFromPayload", () => {
  it("reads a JSON list or a comma list", () => {
    expect(skippedBusinessIdsFromPayload(JSON.stringify(["a", "b"]))).toEqual(["a", "b"]);
    expect(skippedBusinessIdsFromPayload("a,b")).toEqual(["a", "b"]);
  });
});
