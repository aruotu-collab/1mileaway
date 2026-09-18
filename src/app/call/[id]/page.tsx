import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { DirectDial } from "@/components/direct-dial";
import { ListingCard } from "@/components/listing-card";
import { PhoneIcon } from "@/components/phone-icon";
import { startCall } from "@/app/actions/calls";
import { reportNoAnswer, reportTheyAnswered, submitCallFeedback } from "@/app/actions/feedback";
import { nextCallableListing, skippedBusinessIdsFromPayload } from "@/lib/calls/next";
import { CALL_OUTCOME } from "@/lib/feedback";
import { toTelHref } from "@/lib/phone";

export default async function CallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const call = await prisma.call.findUnique({
    where: { id },
    include: {
      business: {
        include: {
          country: true,
          locations: { include: { location: true } },
          professions: true,
        },
      },
      lead: { include: { location: true } },
      review: true,
      events: true,
    },
  });
  if (!call) notFound();

  const tel = call.toNumber ? toTelHref(call.toNumber) : null;
  const reported = call.status === CALL_OUTCOME.ANSWERED || call.status === CALL_OUTCOME.NO_ANSWER;
  const skipEvent = call.events.find((event) => event.type === "skip_chain");
  const alreadyTried = [...skippedBusinessIdsFromPayload(skipEvent?.payload), call.businessId];
  const professionId = call.lead?.professionId ?? call.business.professions[0]?.professionId;
  const locationId = call.lead?.locationId ?? call.business.locations[0]?.locationId;
  const next =
    call.status === CALL_OUTCOME.NO_ANSWER && professionId && locationId
      ? await nextCallableListing({
          countryId: call.business.countryId,
          professionId,
          locationId,
          excludeBusinessIds: alreadyTried,
        })
      : null;
  const country = call.business.country.iso2;
  const professionSlug = professionId
    ? (
        await prisma.professionSlug.findFirst({
          where: { countryId: call.business.countryId, professionId },
        })
      )?.slug
    : null;
  const locationSlug = call.lead?.location?.slug ?? call.business.locations[0]?.location.slug;
  const resultsHref =
    professionSlug && locationSlug ? `/${country}/${professionSlug}/${locationSlug}` : `/${country}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      {tel && !reported ? <DirectDial href={tel} /> : null}
      <h1 className="serif text-4xl">Calling {call.business.name}</h1>
      <p className="mt-3 text-ink-soft">This rings their phone directly.</p>
      <div className="card mt-6 p-5">
        <p className="font-semibold">When they pick up, say:</p>
        <p className="serif mt-2 text-2xl">“I’m calling from 1mileaway.”</p>
        <p className="mt-3 text-sm text-ink-soft">
          That is how they know this enquiry came through the app. We have also emailed them and logged this call in
          their account.
        </p>
      </div>
      {tel ? (
        <a className="btn btn-primary mt-6 w-full" href={tel}>
          <PhoneIcon />
          Call {call.toNumber}
        </a>
      ) : (
        <p className="card mt-6 p-4">This professional has not added a phone number yet.</p>
      )}

      {!reported ? (
        <section className="card mt-6 p-5">
          <h2 className="serif text-2xl">Did they pick up?</h2>
          <p className="mt-2 text-ink-soft">
            We cannot hear the call. Your answer is how we calculate their answer rate.
          </p>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <form action={reportTheyAnswered}>
              <input type="hidden" name="callId" value={call.id} />
              <button className="btn btn-primary w-full" type="submit">
                They answered
              </button>
            </form>
            <form action={reportNoAnswer}>
              <input type="hidden" name="callId" value={call.id} />
              <button className="btn btn-ghost w-full" type="submit">
                No answer
              </button>
            </form>
          </div>
        </section>
      ) : null}

      {call.status === CALL_OUTCOME.NO_ANSWER ? (
        <section className="card mt-6 p-5">
          <h2 className="serif text-2xl">They did not pick up</h2>
          <p className="mt-2 text-ink-soft">
            {next
              ? `Try the next closest professional. ${next.name} is ${next.distanceMiles.toFixed(1)} miles from this area.`
              : "There is nobody else nearby who can take a call through 1mileaway right now."}
          </p>
          {next ? (
            <form action={startCall} className="mt-4">
              <input type="hidden" name="businessId" value={next.id} />
              <input type="hidden" name="professionId" value={professionId ?? ""} />
              <input type="hidden" name="locationId" value={locationId ?? ""} />
              <input type="hidden" name="country" value={country} />
              <input type="hidden" name="returnTo" value={resultsHref} />
              <input type="hidden" name="skip" value={alreadyTried.join(",")} />
              <button className="btn btn-primary w-full" type="submit">
                <PhoneIcon />
                Call {next.name}
              </button>
            </form>
          ) : null}
          <Link href={resultsHref} className="btn btn-ghost mt-3 w-full">
            See other professionals nearby
          </Link>
        </section>
      ) : null}

      {next && call.status === CALL_OUTCOME.NO_ANSWER ? (
        <div className="mt-4">
          <ListingCard
            country={country}
            slug={next.slug}
            name={next.name}
            about={next.about}
            distanceMiles={next.distanceMiles}
            availabilityStatus={next.availabilityStatus}
            availabilityConfirmedAt={next.availabilityConfirmedAt}
            answerRate={next.answerRate}
            answerReports={next.answerReports}
            ratingAvg={next.ratingAvg}
            ratingCount={next.ratingCount}
            claimStatus={next.claimStatus}
            businessId={next.id}
            professionId={professionId}
            locationId={locationId}
            resultsHref={resultsHref}
            phone={next.phone}
            canRequest={false}
            skip={alreadyTried.join(",")}
            showProfileLink
          />
        </div>
      ) : null}

      {call.status === CALL_OUTCOME.ANSWERED && !call.review ? (
        <section className="card mt-6 p-5">
          <h2 className="serif text-2xl">How was this tradesman?</h2>
          <p className="mt-2 text-ink-soft">A short rating after a real call. This is the review other customers see.</p>
          <form action={submitCallFeedback} className="mt-4 grid gap-3">
            <input type="hidden" name="callId" value={call.id} />
            <div className="grid grid-cols-5 gap-2">
              {[1, 2, 3, 4, 5].map((stars) => (
                <button key={stars} className="btn btn-ghost" name="rating" type="submit" value={stars}>
                  {stars}
                </button>
              ))}
            </div>
            <label>
              <span className="mb-1 block text-sm font-medium">Anything to add? (optional)</span>
              <textarea
                className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
                name="body"
                rows={3}
                placeholder="On time, fixed the leak…"
              />
            </label>
          </form>
        </section>
      ) : null}

      {call.review ? (
        <p className="card mt-6 p-5">
          Thanks. You rated {call.business.name} {call.review.rating}/5. That review is now on their listing.
        </p>
      ) : null}
    </main>
  );
}
