import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { settleMockPayment } from "@/app/actions/payments";
import { formatMoney } from "@/lib/utils";

export default async function MockPayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const payment = await prisma.payment.findUnique({ where: { id }, include: { business: true } });
  if (!payment) notFound();

  async function pay() {
    "use server";
    await settleMockPayment(id);
  }

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="serif text-4xl">Mock checkout</h1>
      <p className="mt-3 text-ink-soft">
        Stripe is not configured. This settles {formatMoney(payment.amountMinor, payment.currency)} for {payment.business.name} the same way the webhook would.
      </p>
      <form action={pay} className="mt-6">
        <button className="btn btn-primary" type="submit">
          Pay and settle
        </button>
      </form>
    </main>
  );
}
