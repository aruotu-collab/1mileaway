import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line bg-paper-strong/70">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 text-sm text-ink-soft sm:grid-cols-3">
        <div>
          <p className="serif text-lg text-ink">1mileaway</p>
          <p className="mt-2 max-w-xs">
            Find a professional nearby who is genuinely available and ready to help.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Link href="/for-professionals">For professionals</Link>
          <Link href="/gb/plumbers/catford">Catford plumbers</Link>
          <Link href="/gb/emergency-plumbers/catford">Emergency plumbers</Link>
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
