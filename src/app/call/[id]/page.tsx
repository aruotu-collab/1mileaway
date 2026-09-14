import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { finishCall } from "@/app/actions/calls";

export default async function CallPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const call = await prisma.call.findUnique({
    where: { id },
    include: { business: true, lead: true },
  });
  if (!call) notFound();

  const latestClaim =
    call.business.claimStatus === "UNCLAIMED"
      ? await prisma.emailMessage.findFirst({
          where: { businessId: call.businessId, template: "claim_invite", status: "mocked" },
          orderBy: { createdAt: "desc" },
        })
      : null;
  const claimToken = latestClaim?.payload
    ? (JSON.parse(latestClaim.payload) as { token?: string }).token
    : null;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <h1 className="serif text-4xl">Call simulator</h1>
      <p className="mt-3 text-ink-soft">
        Tracking layer for {call.business.name}. In production this is a telephony provider. Locally, complete the call to qualify a lead.
      </p>
      {call.business.claimStatus === "UNCLAIMED" ? (
        <p className="card mt-4 p-4">
          This listing is not claimed yet. If a work email is on file, we just invited them to claim it and mark
          availability. The customer is not connected to a scraped personal number.
          {claimToken ? (
            <>
              {" "}
              <a className="underline" href={`/claim/${claimToken}`}>
                Open the latest claim invite
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <dl className="card mt-6 grid gap-2 p-5 text-sm">
        <div>Status: {call.status}</div>
        <div>Duration: {call.durationSeconds}s</div>
        <div>Lead: {call.lead?.status ?? "created with the call"}</div>
        <div>Charge mode: {call.lead?.chargingMode ?? "—"}</div>
      </dl>
      {query.done ? (
        <p className="mt-4">
          Call finished. Missed or short calls do not consume the free trial. Connected calls over 45 seconds qualify.
        </p>
      ) : (
        <form action={finishCall} className="card mt-6 grid gap-3 p-5">
          <input type="hidden" name="callId" value={call.id} />
          <label>
            <span className="mb-1 block text-sm font-medium">Duration in seconds</span>
            <input
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              type="number"
              name="durationSeconds"
              defaultValue={60}
              min={0}
            />
          </label>
          <button className="btn btn-primary" type="submit">
            Complete call
          </button>
          <button className="btn btn-ghost" type="submit" name="durationSeconds" value="0">
            Mark missed
          </button>
        </form>
      )}
    </main>
  );
}
