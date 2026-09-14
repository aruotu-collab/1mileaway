import { hashToken } from "@/lib/utils";
import { suppressEmail } from "@/lib/outreach/engine";
import { prisma } from "@/lib/db";

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string; token?: string }>;
}) {
  const query = await searchParams;
  const businessId = query.businessId ?? "";
  const token = query.token ?? "";
  const business = businessId
    ? await prisma.business.findUnique({ where: { id: businessId } })
    : null;
  const expected = business?.contactEmail
    ? hashToken(`unsub:${business.id}:${business.contactEmail.toLowerCase()}`)
    : "";
  const ok = Boolean(business?.contactEmail && token && token === expected);

  if (ok && business?.contactEmail) {
    await suppressEmail({
      email: business.contactEmail,
      reason: "unsubscribe",
      businessId: business.id,
    });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="serif text-4xl">{ok ? "You’ve unsubscribed" : "That link is not valid"}</h1>
      <p className="mt-3 text-ink-soft">
        {ok
          ? "We will not send further listing invites to this address. Customer connection emails after a real call are separate and still require a work email on file."
          : "Check the link in the most recent email, or ask an admin to mark this address do-not-contact."}
      </p>
    </main>
  );
}
