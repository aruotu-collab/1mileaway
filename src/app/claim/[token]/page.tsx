import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/utils";
import { requestClaimLink } from "@/app/actions/claim";
import { ProfessionPicker } from "@/components/profession-picker";
import { listProfessionPicks } from "@/lib/listings/professions";
import { claimCompletePath, parseProfessionIds } from "@/lib/professions";

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sent?: string; error?: string; professions?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const [row, professionPicks] = await Promise.all([
    prisma.actionToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: {
        business: {
          include: {
            locations: { include: { location: true } },
            professions: { include: { profession: { include: { slugs: true } } } },
          },
        },
      },
    }),
    listProfessionPicks(),
  ]);
  if (!row || row.purpose !== "claim" || row.usedAt || row.expiresAt < new Date()) {
    notFound();
  }

  const latestMock = query.sent
    ? await prisma.emailMessage.findFirst({
        where: { template: "magic_link", status: "mocked" },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const mockToken = latestMock?.payload ? (JSON.parse(latestMock.payload) as { token?: string }).token : null;
  const selectedIds = parseProfessionIds(query.professions);
  const professionIds = selectedIds.length
    ? selectedIds
    : row.business.professions.map((item) => item.professionId);
  const next = claimCompletePath(token, professionIds);
  const askedFor =
    row.business.professions[0]?.profession.slugs[0]?.name ??
    row.business.professions[0]?.profession.internalId ??
    "professional";
  const area = row.business.locations[0]?.location.name;
  const intro = area
    ? `Someone nearby just asked for a ${askedFor} in ${area}.`
    : `Someone nearby just asked for a ${askedFor}.`;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-moss-deep">A customer is waiting</p>
      <h1 className="serif mt-3 text-4xl">Claim {row.business.name}</h1>
      <p className="mt-3 text-ink-soft">
        {intro} Tick every trade you actually do — you will show up in those searches — then sign in with the work
        email for this listing. You get two months free, then you can see how many calls 1mileaway sent you.
      </p>
      {query.error === "trades" ? (
        <p className="mt-4 text-rust">Tick at least one trade you do.</p>
      ) : query.error ? (
        <p className="mt-4 text-rust">That claim could not be completed. Use the invited work email.</p>
      ) : null}
      {query.sent ? (
        <p className="card mt-4 p-4">
          We sent a sign-in link.
          {mockToken ? (
            <>
              {" "}
              <a className="underline" href={`/auth/callback?token=${mockToken}&next=${encodeURIComponent(next)}`}>
                Open the latest local sign-in link
              </a>
            </>
          ) : null}
        </p>
      ) : null}
      <form action={requestClaimLink} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Work email</span>
          <input
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            type="email"
            name="email"
            required
            defaultValue={row.business.contactEmail ?? ""}
          />
        </label>
        <fieldset>
          <legend className="mb-1 block text-sm font-medium">Trades you do</legend>
          <p className="mb-2 text-sm text-ink-soft">Select every profession this listing should appear under.</p>
          <ProfessionPicker professions={professionPicks} selectedIds={professionIds} />
        </fieldset>
        <input type="hidden" name="token" value={token} />
        <button className="btn btn-primary" type="submit">
          Claim this listing
        </button>
      </form>
    </main>
  );
}
