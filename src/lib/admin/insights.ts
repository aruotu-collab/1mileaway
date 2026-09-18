import { CALL_OUTCOME } from "@/lib/feedback";
import { siteActivitySnapshot, type SiteActivitySnapshot } from "@/lib/activity";
import { CLAIM_STATUS, PAYMENT_STATES } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { startOfLocalDay } from "@/lib/utils";

export function callStatusLabel(status: string) {
  if (status === CALL_OUTCOME.ANSWERED) return "Customer said they answered";
  if (status === CALL_OUTCOME.NO_ANSWER) return "Customer said no answer";
  return "Call now tapped — outcome not reported";
}

export function claimLabel(status: string) {
  if (status === CLAIM_STATUS.VERIFIED) return "Verified";
  if (status === CLAIM_STATUS.CLAIMED) return "Claimed";
  if (status === CLAIM_STATUS.SUSPENDED) return "Suspended";
  return "Unclaimed";
}

export type AdminFeedItem = {
  at: Date;
  kind: "call" | "ask" | "review" | "payment" | "email" | "audit";
  title: string;
  detail: string;
};

export type AdminOverview = {
  marketplace: SiteActivitySnapshot;
  subscribedCount: number;
  answeredToday: number;
  noAnswerToday: number;
  emailsToday: number;
  feed: AdminFeedItem[];
};

export async function adminOverview(): Promise<AdminOverview> {
  const marketplace = await siteActivitySnapshot();
  const dayStart = startOfLocalDay("Europe/London");

  const [
    subscribedCount,
    answeredToday,
    noAnswerToday,
    emailsToday,
    calls,
    asks,
    reviews,
    payments,
    emails,
    audit,
  ] = await Promise.all([
    prisma.business.count({
      where: { deletedAt: null, paymentState: PAYMENT_STATES.SUBSCRIPTION_ACTIVE },
    }),
    prisma.call.count({ where: { startedAt: { gte: dayStart }, status: CALL_OUTCOME.ANSWERED } }),
    prisma.call.count({ where: { startedAt: { gte: dayStart }, status: CALL_OUTCOME.NO_ANSWER } }),
    prisma.emailMessage.count({ where: { createdAt: { gte: dayStart } } }),
    prisma.call.findMany({
      include: { business: true, review: true },
      orderBy: { startedAt: "desc" },
      take: 12,
    }),
    prisma.lead.findMany({
      where: { callId: null },
      include: { business: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
    prisma.review.findMany({
      include: { business: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.payment.findMany({
      include: { business: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.emailMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const feed: AdminFeedItem[] = [
    ...calls.map((call) => ({
      at: call.startedAt,
      kind: "call" as const,
      title: `Call now · ${call.business.name}`,
      detail: `${callStatusLabel(call.status)}${call.review ? ` · review ${call.review.rating}/5` : ""}`,
    })),
    ...asks.map((ask) => ({
      at: ask.createdAt,
      kind: "ask" as const,
      title: `Ask · ${ask.business.name}`,
      detail:
        ask.business.claimStatus === CLAIM_STATUS.UNCLAIMED
          ? `Could not get through · ${ask.location?.name ?? "no area"}`
          : `Asked, no Call now · ${ask.location?.name ?? "no area"}`,
    })),
    ...reviews.map((review) => ({
      at: review.createdAt,
      kind: "review" as const,
      title: `Review · ${review.business.name}`,
      detail: `${review.rating}/5${review.body ? ` · ${review.body}` : ""}`,
    })),
    ...payments.map((payment) => ({
      at: payment.createdAt,
      kind: "payment" as const,
      title: `Payment · ${payment.business.name}`,
      detail: `${payment.kind} · ${payment.status} · ${payment.provider}`,
    })),
    ...emails
      .filter((email) => email.template !== "magic_link")
      .map((email) => ({
      at: email.createdAt,
      kind: "email" as const,
      title: email.subject,
      detail: `${email.toEmail} · ${email.template} · ${email.status}`,
    })),
    ...audit
      .filter((log) => log.action !== "auth.login")
      .map((log) => ({
      at: log.createdAt,
      kind: "audit" as const,
      title: log.action,
      detail: `${log.entityType}${log.actor?.email ? ` · ${log.actor.email}` : " · system"}`,
    })),
  ]
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 24);

  return {
    marketplace,
    subscribedCount,
    answeredToday,
    noAnswerToday,
    emailsToday,
    feed,
  };
}
