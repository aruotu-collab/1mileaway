import { requestMagicLink } from "@/app/actions/auth";
import { prisma } from "@/lib/db";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string; next?: string; email?: string }>;
}) {
  const query = await searchParams;
  const resendConfigured = Boolean(process.env.RESEND_API_KEY);
  const latestMock = query.sent
    ? await prisma.emailMessage.findFirst({
        where: {
          template: "magic_link",
          status: "mocked",
          ...(query.email ? { toEmail: query.email.toLowerCase() } : {}),
        },
        orderBy: { createdAt: "desc" },
      })
    : null;
  const mockToken = latestMock?.payload ? (JSON.parse(latestMock.payload) as { token?: string }).token : null;
  const next = query.next ?? "/professional";

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="serif text-4xl">Sign in</h1>
      <p className="mt-3 text-ink-soft">
        {resendConfigured
          ? "We email a one-time link."
          : "Email delivery is off in this local setup. After you submit, use the on-screen link — nothing is sent to Gmail until a Resend API key is added."}
      </p>
      {query.sent ? (
        <p className="card mt-4 p-4">
          {resendConfigured ? (
            <>Check {query.email ?? "your inbox"} for the sign-in link.</>
          ) : mockToken ? (
            <>
              No inbox message was sent.{" "}
              <a className="font-semibold underline" href={`/auth/callback?token=${mockToken}&next=${encodeURIComponent(next)}`}>
                Open the local sign-in link
              </a>
            </>
          ) : (
            <>The link was created, but we could not find the local copy. Try again.</>
          )}
        </p>
      ) : null}
      {query.error ? <p className="mt-4 text-rust">That sign-in link is not valid.</p> : null}
      <form action={requestMagicLink} className="card mt-6 grid gap-3 p-5">
        <label>
          <span className="mb-1 block text-sm font-medium">Email</span>
          <input
            required
            className="w-full rounded-2xl border border-line bg-paper px-4 py-3"
            type="email"
            name="email"
            defaultValue={query.email ?? ""}
            placeholder="you@example.com"
          />
        </label>
        <input type="hidden" name="next" value={next} />
        <button className="btn btn-primary" type="submit">
          {resendConfigured ? "Email me a link" : "Create a local sign-in link"}
        </button>
      </form>
      <p className="mt-6 text-sm text-ink-soft">
        Demo professionals: kira@demo.1mileaway.com, lee@demo.1mileaway.com, pat@demo.1mileaway.com.
        Super admin: aruotu@gmail.com.
      </p>
    </main>
  );
}
