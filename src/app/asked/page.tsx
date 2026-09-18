import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { CopyMessageButton } from "@/components/copy-message-button";
import { claimUrlForListing } from "@/lib/claim/invite";
import { CLAIM_STATUS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { safeInternalPath } from "@/lib/navigation";
import { customerAskMessage, toSmsHref, toWhatsAppHref } from "@/lib/phone";

export default async function AskedPage({
  searchParams,
}: {
  searchParams: Promise<{ business?: string; from?: string }>;
}) {
  const query = await searchParams;
  const back = safeInternalPath(query.from, "/");
  const business = query.business
    ? await prisma.business.findUnique({
        where: { id: query.business },
        include: { locations: { include: { location: true } } },
      })
    : null;
  if (!business || business.deletedAt) notFound();
  if (business.claimStatus !== CLAIM_STATUS.UNCLAIMED || business.contactEmail?.trim()) {
    redirect(`${back}${back.includes("?") ? "&" : "?"}asked=1`);
  }
  const phone = business.phoneReal?.trim() || business.phoneDisplay?.trim();
  if (!phone) redirect(`${back}${back.includes("?") ? "&" : "?"}asked=1`);

  const area = business.locations[0]?.location.name ?? "your area";
  const claimUrl = await claimUrlForListing(business.id);
  const message = customerAskMessage({ area, claimUrl });
  const sms = toSmsHref(phone, message);
  const whatsapp = toWhatsAppHref(phone, message);

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="serif text-4xl">Send them a message</h1>
      <p className="mt-3 text-ink-soft">
        {business.name} is not on email yet. Open your messages app and send this yourself — same idea as Call now.
      </p>
      <p className="card mt-6 p-4 text-sm">{message}</p>
      <div className="mt-6 flex flex-col gap-2">
        {sms ? (
          <a href={sms} className="btn btn-primary">
            Text message
          </a>
        ) : null}
        {whatsapp ? (
          <a href={whatsapp} className="btn btn-ghost">
            WhatsApp
          </a>
        ) : null}
        <CopyMessageButton text={message} />
      </div>
      <p className="mt-6">
        <Link href={back} className="text-sm text-moss-deep hover:underline">
          ← Back to results
        </Link>
      </p>
    </main>
  );
}
