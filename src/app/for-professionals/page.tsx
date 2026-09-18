import Link from "next/link";
import { subscriptionPriceLabel } from "@/lib/subscription";

export default function ForProfessionalsPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="serif text-5xl leading-tight">Get work from people nearby.</h1>
      <p className="mt-4 text-lg text-ink-soft">
        Two months free. Customers ring your own number and say they found you on 1mileaway. We email you and show
        every call in your account. After the trial, {subscriptionPriceLabel()} keeps Call now on. No per-lead bill.
      </p>
      <ol className="mt-8 grid gap-4">
        <li className="card p-5">
          <p className="font-semibold">1. Claim your listing</p>
          <p className="text-ink-soft">Use your own work email and the phone you actually answer.</p>
        </li>
        <li className="card p-5">
          <p className="font-semibold">2. Two months free</p>
          <p className="text-ink-soft">Call now is on. You get the same customer calls a paying tradesman gets.</p>
        </li>
        <li className="card p-5">
          <p className="font-semibold">3. See the numbers</p>
          <p className="text-ink-soft">Your dashboard counts every Call now tap through the web app, plus customers who asked but could not get through. That is the proof.</p>
        </li>
        <li className="card p-5">
          <p className="font-semibold">4. Pay only if it worked</p>
          <p className="text-ink-soft">If the calls are worth it, continue for {subscriptionPriceLabel()}. If not, Call now simply turns off.</p>
        </li>
      </ol>
      <Link href="/join" className="btn btn-primary mt-8">
        Claim your listing
      </Link>
    </main>
  );
}
