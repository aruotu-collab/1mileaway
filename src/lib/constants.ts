export const APP_NAME = "1mileaway";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export const SESSION_COOKIE = "oma_session";
export const SESSION_DAYS = 14;

export const SUPER_ADMIN_EMAILS = (process.env.SUPER_ADMIN_EMAILS ?? "aruotu@gmail.com")
  .split(",")
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

export const AVAILABLE_NOW_HOURS = 4;

export const ROLES = {
  visitor: "visitor",
  professional: "professional",
  support_admin: "support_admin",
  finance_admin: "finance_admin",
  content_admin: "content_admin",
  super_admin: "super_admin",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const ADMIN_ROLES: Role[] = [
  ROLES.support_admin,
  ROLES.finance_admin,
  ROLES.content_admin,
  ROLES.super_admin,
];

export const AVAILABILITY = {
  AVAILABLE_NOW: "AVAILABLE_NOW",
  AVAILABLE_TODAY: "AVAILABLE_TODAY",
  AVAILABLE_LATER: "AVAILABLE_LATER",
  LIMITED: "LIMITED",
  BUSY: "BUSY",
  NOT_TODAY: "NOT_TODAY",
  UNKNOWN: "UNKNOWN",
} as const;

export type AvailabilityStatus = (typeof AVAILABILITY)[keyof typeof AVAILABILITY];

export const PAYMENT_STATES = {
  FREE_TRIAL_ACTIVE: "FREE_TRIAL_ACTIVE",
  FREE_TRIAL_EXHAUSTED: "FREE_TRIAL_EXHAUSTED",
  TRUST_LEAD_AVAILABLE: "TRUST_LEAD_AVAILABLE",
  OUTSTANDING_LEAD: "OUTSTANDING_LEAD",
  PAID_ELIGIBLE: "PAID_ELIGIBLE",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  PAUSED_BY_PROFESSIONAL: "PAUSED_BY_PROFESSIONAL",
  SUSPENDED: "SUSPENDED",
} as const;

export type PaymentState = (typeof PAYMENT_STATES)[keyof typeof PAYMENT_STATES];

export const CLAIM_STATUS = {
  UNCLAIMED: "UNCLAIMED",
  CLAIMED: "CLAIMED",
  VERIFIED: "VERIFIED",
  SUSPENDED: "SUSPENDED",
} as const;

export const LEAD_STATUS = {
  CREATED: "CREATED",
  QUALIFIED: "QUALIFIED",
  DISQUALIFIED: "DISQUALIFIED",
  SETTLED: "SETTLED",
} as const;

export const CHARGING = {
  FREE_TRIAL: "FREE_TRIAL",
  TRUST_LEAD: "TRUST_LEAD",
  PAID: "PAID",
} as const;

export const OUTREACH = {
  NONE: "NONE",
  NO_EMAIL: "NO_EMAIL",
  ELIGIBLE: "ELIGIBLE",
  INVITE_SENT: "INVITE_SENT",
  FOLLOWUP_1: "FOLLOWUP_1",
  FOLLOWUP_2: "FOLLOWUP_2",
  COMPLETE: "COMPLETE",
  UNSUBSCRIBED: "UNSUBSCRIBED",
  BOUNCED: "BOUNCED",
  DO_NOT_CONTACT: "DO_NOT_CONTACT",
} as const;

export const OUTREACH_DAY_MS = 24 * 60 * 60 * 1000;
