import Link from "next/link";
import { startCall } from "@/app/actions/calls";
import { AvailabilityBadge } from "@/components/availability-badge";
import { PhoneIcon } from "@/components/phone-icon";

type ListingCardProps = {
  country: string;
  slug: string;
  name: string;
  about?: string | null;
  distanceMiles: number;
  availabilityStatus: string;
  availabilityConfirmedAt?: Date | null;
  answerRate: number;
  ratingAvg: number;
  ratingCount: number;
  claimStatus: string;
  sponsored?: boolean;
  businessId: string;
  professionId?: string;
  locationId?: string;
  featured?: boolean;
  resultsHref?: string;
  showProfileLink?: boolean;
  fromVisitor?: boolean;
  phone?: string | null;
};

export function ListingCard(props: ListingCardProps) {
  const profileHref = props.resultsHref
    ? `/${props.country}/p/${props.slug}?from=${encodeURIComponent(props.resultsHref)}`
    : `/${props.country}/p/${props.slug}`;

  return (
    <article className={`card p-5 ${props.featured ? "ring-2 ring-moss/30" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="serif text-2xl leading-tight">
              {props.showProfileLink === false ? (
                props.name
              ) : (
                <Link href={profileHref} className="hover:underline">
                  {props.name}
                </Link>
              )}
            </h2>
            {props.sponsored ? (
              <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">Sponsored</span>
            ) : null}
            {props.claimStatus === "VERIFIED" ? (
              <span className="rounded-full bg-moss/10 px-2 py-0.5 text-xs font-semibold text-moss-deep">
                Verified
              </span>
            ) : null}
            {props.claimStatus === "UNCLAIMED" ? (
              <span className="rounded-full bg-sand px-2 py-0.5 text-xs font-semibold">Not yet claimed</span>
            ) : null}
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {props.distanceMiles.toFixed(1)} miles {props.fromVisitor ? "from you" : "from this area"}
          </p>
        </div>
      </div>
      <div className="mt-3">
        <AvailabilityBadge status={props.availabilityStatus} confirmedAt={props.availabilityConfirmedAt} />
      </div>
      {props.about ? <p className="mt-3 text-ink-soft">{props.about}</p> : null}
      <dl className="mt-4 flex flex-wrap gap-4 text-sm text-ink-soft">
        <div>
          <dt className="sr-only">Answer rate</dt>
          <dd>{Math.round(props.answerRate * 100)}% answer rate</dd>
        </div>
        {props.ratingCount > 0 ? (
          <div>
            <dt className="sr-only">Rating</dt>
            <dd>
              {props.ratingAvg.toFixed(1)} from {props.ratingCount} reviews
            </dd>
          </div>
        ) : null}
      </dl>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        {props.phone ? (
          <form action={startCall} className="flex-1">
            <input type="hidden" name="businessId" value={props.businessId} />
            <input type="hidden" name="professionId" value={props.professionId ?? ""} />
            <input type="hidden" name="locationId" value={props.locationId ?? ""} />
            <input type="hidden" name="country" value={props.country} />
            <input type="hidden" name="returnTo" value={props.resultsHref ?? `/${props.country}/p/${props.slug}`} />
            <button className="btn btn-primary w-full" type="submit">
              <PhoneIcon />
              Call now
            </button>
          </form>
        ) : (
          <p className="flex-1 rounded-2xl border border-line bg-paper px-4 py-3 text-sm text-ink-soft">
            {props.claimStatus === "UNCLAIMED"
              ? "This listing is not claimed yet, so we do not connect a phone number."
              : "This professional has not added a phone number yet."}
          </p>
        )}
        {props.showProfileLink === false ? null : (
          <Link href={profileHref} className="btn btn-ghost flex-1">
            {props.claimStatus === "UNCLAIMED" ? "Is this your business?" : "View profile"}
          </Link>
        )}
      </div>
    </article>
  );
}
