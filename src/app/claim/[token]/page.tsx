import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashToken } from "@/lib/utils";
import { requestMagicLink } from "@/app/actions/auth";

export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const { token } = await params;
  const query = await searchParams;
  const row = await prisma.actionToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: {
      business: {
        include: {
          locations: { include: { location: true } },
          professions: { include: { profession: true } },
        },
      },
    },
  });
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
  const next = `/claim/complete?token=${token}`;

  return (
    <main className="mx-auto max-w-lg px-4 py-12">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-moss-deep">A customer is waiting</p>
      <h1 className="serif mt-3 text-4xl">Claim {row.business.name}</h1>
      <p className="mt-3 text-ink-soft">
        Someone nearby just asked for a {row.business.professions[0]?.profession.internalId ?? "professional"}
        {row.business.locations[0] ? ` in ${row.business.locations[0].location.name}` : ""}. Sign in with the work
        email for this listing to claim it, then say if you are available. You start on a free trial — no prepaid wallet.
      </p>
      {query.error ? <p className="mt-4 text-rust">That claim could not be completed. Use the invited work email.</p> : null}
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
      <form action={requestMagicLink} className="card mt-6 grid gap-3 p-5">
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
        <input type="hidden" name="next" value={next} />
        <input type="hidden" name="sentRedirect" value={`/claim/${token}?sent=1`} />
        <button className="btn btn-primary" type="submit">
          Claim this listing
        </button>
      </form>
    </main>
  );
}
