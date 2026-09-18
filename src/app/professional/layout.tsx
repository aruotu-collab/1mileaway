import Link from "next/link";

export default function ProfessionalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="border-b border-line bg-paper-strong/70">
        <nav className="mx-auto flex max-w-3xl flex-wrap gap-4 px-4 py-3 text-sm">
          <Link href="/professional">Overview</Link>
          <Link href="/professional/leads">Calls</Link>
          <Link href="/professional/payments">Subscription</Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
