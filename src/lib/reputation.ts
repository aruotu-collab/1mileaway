import { MIN_ANSWER_REPORTS } from "@/lib/constants";

export function answerRateFromCounts(answered: number, reports: number) {
  if (reports <= 0) return 0;
  return answered / reports;
}

export function canShowAnswerRate(answerReports: number) {
  return answerReports >= MIN_ANSWER_REPORTS;
}

export function rankingAnswerScore(answerRate: number, answerReports = 0) {
  if (!canShowAnswerRate(answerReports)) return 0.5;
  return Math.min(1, Math.max(0, answerRate));
}
