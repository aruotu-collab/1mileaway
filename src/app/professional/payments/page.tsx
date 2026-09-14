import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { payOutstanding } from "@/app/actions/payments";
import { formatMoney } from "@/lib/utils";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<{ settled?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login?next=/professional/payments");
  const query = await searchParams;
  const link = await prisma.businessUser.findFirst({
    where: { profileId: user.id },
    include: {
      business: {
        include: {
          outstanding: { include: { lead: true } },
          payments: { orderBy: { createdAt: "desc" } },
        },
      },
    },
  });
  if (!link) redirect("/professional");
  const open = link.business.outstanding.find((row) => row.status === "OPEN");

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="serif text-4xl">Payments</h1>
      {query.settled ? <p className="card mt-4 p-4">That lead is settled. Confirm whether you are available now.</p> : null}
      {open ? (
        <form action={payOutstanding} className="card mt-6 p-5">
          <p className="serif text-2xl">Settle this lead to continue</p>
          <p className="mt-2 text-ink-soft">{formatMoney(open.amountMinor, open.currency)}</p>
          <button className="btn btn-primary mt-4" type="submit">
            Pay
          </button>
        </form>
      ) : (
        <p className="mt-4 text-ink-soft">No outstanding lead.</p>
      )}
      <ul className="mt-8 grid gap-2">
        {link.business.payments.map((payment) => (
          <li key={payment.id} className="card p-4 text-sm">
            {payment.status} · {formatMoney(payment.amountMinor, payment.currency)}
          </li>
        ))}
      </ul>
    </main>
  );
}
