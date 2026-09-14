import { prisma } from "@/lib/db";
import { APP_URL } from "@/lib/constants";
import { randomToken } from "@/lib/utils";

export type EmailTemplate =
  | "magic_link"
  | "availability_followup"
  | "trust_lead"
  | "payment_request"
  | "payment_settled"
  | "lead_qualified"
  | "claim_invite"
  | "outreach_day3"
  | "outreach_day8";

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

export function magicLinkHtml(token: string) {
  const url = `${APP_URL}/auth/callback?token=${token}`;
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
    <p>They tried to reach <strong>${input.businessName}</strong>. Claim this listing to receive the lead. No prepaid wallet — you start on a free trial of qualified leads.</p>
    <p><a href="${input.claimUrl}">Claim this listing</a></p>
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
  return `<p>Finish claiming <strong>${input.businessName}</strong> on 1mileaway. Free trial of qualified leads. No prepaid wallet.</p>
    <p><a href="${input.claimUrl}">Claim this listing</a></p>
    <p><a href="${input.availableUrl}">I am available now</a></p>
    <p><a href="${input.unsubscribeUrl}">Unsubscribe</a></p>`;
}

export function paymentRequestHtml(checkoutUrl: string, amount: string) {
  return `<p>A customer was connected. Settle this lead (${amount}) to keep receiving work.</p>
    <p><a href="${checkoutUrl}">Pay to continue</a></p>`;
}

export function newActionToken() {
  return randomToken();
}
