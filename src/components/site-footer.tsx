import Link from "next/link";
import { getRequestUi } from "@/lib/countries/request";

export async function SiteFooter() {
  const { copy } = await getRequestUi();
  return (
    <footer className="mt-16 border-t border-line bg-paper-strong/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
        <div>
          <p className="serif text-lg text-ink">1mileaway</p>
          <p className="mt-2 max-w-xs">{copy.homeLead}</p>
          <p className="mt-3 text-xs">{copy.billingNote}</p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/">{copy.findHelp}</Link>
          <Link href="/for-professionals">{copy.forProfessionals}</Link>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/privacy">Privacy</Link>
          <Link href="/cookies">Cookies</Link>
          <Link href="/terms">Terms</Link>
        </div>
      </div>
    </footer>
  );
}
