import { requestProfileClaim } from "@/app/actions/claim";
import { maskEmail } from "@/lib/utils";
import { unclaimedDemandCopy } from "@/lib/listing-insights";

export function ClaimListingCta({
  businessId,
  country,
  slug,
  name,
  contactEmail,
  from,
  sent,
  error,
  asks = 0,
  asksLast30 = 0,
  trades = [],
  areas = [],
}: {
  businessId: string;
  country: string;
  slug: string;
  name: string;
  contactEmail?: string | null;
  from?: string;
  sent?: boolean;
  error?: string;
  asks?: number;
  asksLast30?: number;
  trades?: string[];
  areas?: string[];
}) {
  return (
    <section className="card mt-8 p-5">
      <h2 className="serif text-2xl">Is this your business?</h2>
      <p className="mt-2 text-ink-soft">{unclaimedDemandCopy({ asks, asksLast30, trades, areas })}</p>
      <p className="mt-3 text-ink-soft">
        Claim {name} to turn on Call now for two months free. Your dashboard will count every tap through the web app.
        We cannot show page views, call length, or whether a phone was answered.
      </p>
      {sent ? (
        <p className="mt-4">
          We sent a claim link
          {contactEmail ? ` to ${maskEmail(contactEmail)}` : " to the work email you entered"}. Use that inbox to
          finish claiming.
        </p>
      ) : null}
      {error === "email" ? <p className="mt-3 text-rust">Enter the work email for this listing.</p> : null}
      {error === "gone" ? <p className="mt-3 text-rust">This listing cannot be claimed.</p> : null}
      <form action={requestProfileClaim} className="mt-4 grid gap-3">
        <input type="hidden" name="businessId" value={businessId} />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name="slug" value={slug} />
        <input type="hidden" name="from" value={from ?? ""} />
        {contactEmail ? null : (
          <label>
            <span className="mb-1 block text-sm font-medium">Work email</span>
            <input
              className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
              type="email"
              name="email"
              required
            />
          </label>
        )}
        <button className="btn btn-primary" type="submit">
          Claim this listing free
        </button>
      </form>
    </section>
  );
}

export function AddYourBusinessCta({
  professionLabel,
  locationName,
  joinHref,
}: {
  professionLabel: string;
  locationName: string;
  joinHref: string;
}) {
  return (
    <section className="card mt-12 p-5">
      <h2 className="serif text-2xl">
        Are you a {professionLabel} serving {locationName}?
      </h2>
      <p className="mt-2 text-ink-soft">
        Add your business free with your own work email. We do not collect contact details from other websites.
      </p>
      <a href={joinHref} className="btn btn-primary mt-4 inline-flex">
        Add your business free
      </a>
    </section>
  );
}
