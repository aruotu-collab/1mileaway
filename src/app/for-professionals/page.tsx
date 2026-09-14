import Link from "next/link";

export default function ForProfessionalsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="serif text-5xl leading-tight">Get work from people nearby.</h1>
      <p className="mt-4 text-lg text-ink-soft">
        You receive a free trial of qualified leads. No card needed. After that, one trust lead is delivered first — settle it to continue. We never hold a prepaid wallet of your cash.
      </p>
      <ol className="mt-8 grid gap-4">
        <li className="card p-5">
          <p className="font-semibold">1. Free trial</p>
          <p className="text-ink-soft">A configurable number of qualified connections, default five.</p>
        </li>
        <li className="card p-5">
          <p className="font-semibold">2. One trust lead</p>
          <p className="text-ink-soft">The customer is connected first. You never stack unpaid debt.</p>
        </li>
        <li className="card p-5">
          <p className="font-semibold">3. Settle to continue</p>
          <p className="text-ink-soft">Pay that lead in your local currency, then confirm you are available again.</p>
        </li>
      </ol>
      <Link href="/join" className="btn btn-primary mt-8">
        Claim your listing
      </Link>
    </main>
  );
}
