import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DirectDial } from "@/components/direct-dial";
import { PhoneIcon } from "@/components/phone-icon";
import { toTelHref } from "@/lib/phone";

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = await prisma.call.findUnique({
    where: { id },
    include: { business: true, lead: true },
  });
  if (!call) notFound();

  const tel = call.toNumber ? toTelHref(call.toNumber) : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      {tel ? <DirectDial href={tel} /> : null}
      <h1 className="serif text-4xl">Calling {call.business.name}</h1>
      <p className="mt-3 text-ink-soft">
        This rings their phone directly. There is no call-tracking number in between.
      </p>
      {tel ? (
        <a className="btn btn-primary mt-6 w-full" href={tel}>
          <PhoneIcon />
          Call {call.toNumber}
        </a>
      ) : (
        <p className="card mt-6 p-4">This professional has not added a phone number yet.</p>
      )}
      <p className="mt-4 text-sm text-ink-soft">
        After you speak, they confirm whether it was a real job. Missed or not-a-job calls do not use their free trial.
      </p>
      {call.lead ? (
        <p className="mt-2 text-sm text-ink-soft">Lead status: {call.lead.status.toLowerCase()}.</p>
      ) : null}
    </main>
  );
}
