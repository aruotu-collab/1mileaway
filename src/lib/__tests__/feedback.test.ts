import { describe, expect, it } from "vitest";
import { answerRateFromCounts, canShowAnswerRate, rankingAnswerScore } from "@/lib/reputation";

describe("answerRateFromCounts", () => {
  it("is answered over reported outcomes", () => {
    expect(answerRateFromCounts(8, 10)).toBe(0.8);
    expect(answerRateFromCounts(0, 0)).toBe(0);
  });
});

describe("canShowAnswerRate", () => {
  it("waits for five customer reports", () => {
    expect(canShowAnswerRate(4)).toBe(false);
    expect(canShowAnswerRate(5)).toBe(true);
  });
});

describe("rankingAnswerScore", () => {
  it("treats a thin sample as neutral", () => {
    expect(rankingAnswerScore(1, 2)).toBe(0.5);
    expect(rankingAnswerScore(0.8, 10)).toBe(0.8);
  });
});
