import { prisma } from "@/lib/db";
import { writeAudit } from "@/lib/admin/audit";
import { answerRateFromCounts } from "@/lib/reputation";

export { answerRateFromCounts, canShowAnswerRate, rankingAnswerScore } from "@/lib/reputation";

export const CALL_OUTCOME = {
  ANSWERED: "answered",
  NO_ANSWER: "no_answer",
} as const;

export type CallOutcome = (typeof CALL_OUTCOME)[keyof typeof CALL_OUTCOME];

export async function refreshListingReputation(businessId: string) {
  const [answered, reports, reviews] = await Promise.all([
    prisma.call.count({ where: { businessId, status: CALL_OUTCOME.ANSWERED } }),
    prisma.call.count({
      where: { businessId, status: { in: [CALL_OUTCOME.ANSWERED, CALL_OUTCOME.NO_ANSWER] } },
    }),
    prisma.review.aggregate({
      where: { businessId, published: true },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  await prisma.business.update({
    where: { id: businessId },
    data: {
      answerReports: reports,
      answerRate: answerRateFromCounts(answered, reports),
      ratingAvg: reviews._avg.rating ?? 0,
      ratingCount: reviews._count._all,
    },
  });
}

export async function reportCallOutcome(callId: string, outcome: CallOutcome) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { lead: true },
  });
  if (!call) throw new Error("Call not found");
  if (call.status === CALL_OUTCOME.ANSWERED || call.status === CALL_OUTCOME.NO_ANSWER) {
    return call;
  }

  await prisma.call.update({
    where: { id: callId },
    data: { status: outcome, endedAt: new Date() },
  });
  await prisma.callEvent.create({
    data: { callId, type: `customer_${outcome}` },
  });
  if (call.lead) {
    await prisma.lead.update({
      where: { id: call.lead.id },
      data: {
        status: outcome === CALL_OUTCOME.ANSWERED ? "QUALIFIED" : "DISQUALIFIED",
        qualification: outcome === CALL_OUTCOME.ANSWERED ? "CONNECTED" : "MISSED",
        qualifiedAt: new Date(),
      },
    });
  }
  await refreshListingReputation(call.businessId);
  await writeAudit({
    action: "call.customer_outcome",
    entityType: "call",
    entityId: callId,
    metadata: { outcome, businessId: call.businessId },
  });
  return prisma.call.findUniqueOrThrow({ where: { id: callId } });
}

export async function submitCallReview(callId: string, rating: number, body?: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { review: true },
  });
  if (!call) throw new Error("Call not found");
  if (call.status !== CALL_OUTCOME.ANSWERED) {
    throw new Error("Only answered calls can be reviewed.");
  }
  if (call.review) return call.review;

  const stars = Math.min(5, Math.max(1, Math.round(rating)));
  const comment = body?.trim() ?? "";
  const review = await prisma.review.create({
    data: {
      businessId: call.businessId,
      callId,
      rating: stars,
      body: comment || null,
      source: "call",
      published: true,
    },
  });
  await refreshListingReputation(call.businessId);
  await writeAudit({
    action: "review.created",
    entityType: "review",
    entityId: review.id,
    metadata: { callId, businessId: call.businessId, rating: stars },
  });
  return review;
}
