import { prisma } from "@/lib/db";
import { APP_URL } from "@/lib/constants";
import { randomToken, safeNextPath } from "@/lib/utils";

export type EmailTemplate =
  | "magic_link"
  | "availability_followup"
  | "trust_lead"
  | "payment_request"
  | "payment_settled"
  | "lead_qualified"
  | "inbound_call"
  | "subscription_started"
  | "trial_started"
  | "trial_ended"
  | "trial_checkin"
  | "trial_ending"
  | "subscribe_from_demand"
  | "claim_invite"
  | "outreach_day3"
  | "outreach_day8"
  | "contact_received"
  | "contact_reply";

type SendInput = {
  to: string;
  template: EmailTemplate;
  subject: string;
  html: string;
  businessId?: string;
  payload?: Record<string, unknown>;
};

export async function sendEmail(input: SendInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "1mileaway <hello@1mileaway.com>";

  const record = await prisma.emailMessage.create({
    data: {
      businessId: input.businessId ?? null,
      toEmail: input.to,
      template: input.template,
      subject: input.subject,
      status: apiKey ? "queued" : "mocked",
      payload: JSON.stringify({ html: input.html, ...input.payload }),
    },
  });

  if (!apiKey) {
    await prisma.emailEvent.create({
      data: { emailId: record.id, type: "mocked", payload: JSON.stringify({ to: input.to }) },
    });
    if (process.env.NODE_ENV !== "test") {
      console.info(`[email:mock] ${input.template} → ${input.to} ${input.subject}`);
    }
    return { id: record.id, mocked: true };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
    }),
  });

  const body = (await res.json().catch(() => ({}))) as { id?: string; message?: string };
  const resendId = typeof body.id === "string" ? body.id : undefined;
  await prisma.emailMessage.update({
    where: { id: record.id },
    data: {
      status: res.ok ? "sent" : "failed",
      payload: JSON.stringify({ html: input.html, ...input.payload, resendId, error: res.ok ? undefined : body }),
    },
  });
  await prisma.emailEvent.create({
    data: {
      emailId: record.id,
      type: res.ok ? "sent" : "failed",
      payload: JSON.stringify(body),
    },
  });
  return { id: record.id, mocked: false };
}

export function magicLinkHtml(token: string, next = "/professional") {
  const url = `${APP_URL}/auth/callback?token=${encodeURIComponent(token)}&next=${encodeURIComponent(safeNextPath(next))}`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px">
  <tr>
    <td style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.6;color:#1b2117">
      <p style="margin:0 0 16px">Hi there,</p>
      <p style="margin:0 0 24px">Use the secure link below to sign in to your 1mileaway account.</p>
      <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700">Sign in to 1mileaway</h1>
      <p style="margin:0 0 16px">This link is unique to you and should only be used to access your account. For your security, please don't forward or share this email.</p>
      <p style="margin:0 0 16px">If you didn't request this sign-in link, you can safely ignore this email.</p>
      <p style="margin:0 0 28px">Thanks,</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="border-radius:8px;background:#c9a227">
            <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:700;color:#ffffff;text-decoration:none">Sign in to 1mileaway</a>
          </td>
        </tr>
      </table>
      <p style="margin:28px 0 8px;font-size:14px;color:#4a5344">If the button does not work, paste this link into your browser:</p>
      <p style="margin:0;font-size:14px;word-break:break-all"><a href="${url}" style="color:#246b3d">${url}</a></p>
    </td>
  </tr>
</table>`;
}

export function availabilityActionHtml(token: string) {
  const now = `${APP_URL}/action/availability?token=${token}&status=AVAILABLE_NOW`;
  const busy = `${APP_URL}/action/availability?token=${token}&status=BUSY`;
  return `<p>Are you available to take work right now?</p>
    <p><a href="${now}">I am available now</a></p>
    <p><a href="${busy}">I am busy</a></p>`;
}

export function claimInviteHtml(input: {
  businessName: string;
  area: string;
  profession: string;
  claimUrl: string;
  availableUrl: string;
  unsubscribeUrl?: string;
}) {
  return `<p>A customer in ${input.area} just asked for a ${input.profession} through 1mileaway.</p>
    <p>They tried to reach <strong>${input.businessName}</strong>. Claim this listing and you get two months free. Customers ring your own number, we email you, and we count every call so you can see if it is worth paying for.</p>
    <p><a href="${input.claimUrl}">Claim this listing — two months free</a></p>
    <p>Already joining? After you claim, you can mark availability from your dashboard, or use this link:</p>
    <p><a href="${input.availableUrl}">I am available now</a></p>
    ${input.unsubscribeUrl ? `<p><a href="${input.unsubscribeUrl}">Unsubscribe from listing invites</a></p>` : ""}`;
}

export function listingInviteHtml(input: {
  businessName: string;
  claimUrl: string;
  availableUrl: string;
  unsubscribeUrl: string;
}) {
  return `<p>Finish claiming <strong>${input.businessName}</strong> on 1mileaway. You get two months free: nearby customers can ring you, and we count every call in your account.</p>
    <p><a href="${input.claimUrl}">Claim this listing — two months free</a></p>
    <p><a href="${input.availableUrl}">I am available now</a></p>
    <p><a href="${input.unsubscribeUrl}">Unsubscribe</a></p>`;
}

export function inboundCallHtml(input: {
  businessName: string;
  area: string;
  phone: string;
  totalCalls?: number;
}) {
  const total = input.totalCalls ?? 1;
  return `<p>A customer just tapped Call now on 1mileaway. Their phone is ringing <strong>${input.businessName}</strong> on ${input.phone}.</p>
    <p>They have been asked to say they found you on 1mileaway when you pick up.</p>
    <p>1mileaway has now sent you <strong>${total}</strong> customer call${total === 1 ? "" : "s"}. That running total is what you use to decide whether to keep the listing after your trial.</p>
    <p><a href="${APP_URL}/professional/leads">See your call statistics</a></p>
    <p>If they asked for work in ${input.area}, that is a real 1mileaway enquiry.</p>`;
}

export function subscribeFromDemandHtml(input: {
  businessName: string;
  area: string;
  subscribeUrl: string;
  totalCalls?: number;
}) {
  const calls = input.totalCalls ?? 0;
  return `<p>A customer in ${input.area} just asked for <strong>${input.businessName}</strong> on 1mileaway.</p>
    <p>They could not be connected because Call now is off. ${calls ? `During your trial we sent you ${calls} calls. ` : ""}Subscribe to take the next one on your own number.</p>
    <p><a href="${input.subscribeUrl}">See your numbers and subscribe</a></p>`;
}

export function trialStartedHtml(input: { businessName: string; trialEndLabel: string; priceLabel: string }) {
  return `<p>Your listing for <strong>${input.businessName}</strong> is live. You have two months free, until ${input.trialEndLabel}.</p>
    <p>Nearby customers can tap Call now and ring your own number. Each time they do, we email you and add it to your call count.</p>
    <p>At the end of the trial we send you that analysis so you can decide whether ${input.priceLabel} is worth it. If it is not, Call now simply turns off.</p>
    <p><a href="${APP_URL}/professional">Open your dashboard</a></p>`;
}

export function trialStatsHtml(input: {
  heading: string;
  businessName: string;
  totalCalls: number;
  callsLast30: number;
  asks: number;
  daysLeft?: number | null;
  priceLabel: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const days =
    input.daysLeft == null ? "" : `<p>Your free trial has ${input.daysLeft} day${input.daysLeft === 1 ? "" : "s"} left.</p>`;
  return `<p>${input.heading}</p>
    <p>So far 1mileaway has sent <strong>${input.businessName}</strong>:</p>
    <ul>
      <li><strong>${input.totalCalls}</strong> customer calls in total</li>
      <li><strong>${input.callsLast30}</strong> in the last 30 days</li>
      <li><strong>${input.asks}</strong> more customers asked for you when they could not get through</li>
    </ul>
    ${days}
    <p>That is the proof of whether this is worth ${input.priceLabel}.</p>
    <p><a href="${input.ctaUrl}">${input.ctaLabel}</a></p>`;
}

export function paymentRequestHtml(checkoutUrl: string, amount: string) {
  return `<p>A customer was connected. Settle this lead (${amount}) to keep receiving work.</p>
    <p><a href="${checkoutUrl}">Pay to continue</a></p>`;
}

export function newActionToken() {
  return randomToken();
}
