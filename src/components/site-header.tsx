import Link from "next/link";
import { getSession, isAdmin } from "@/lib/auth/session";
import { signOut } from "@/app/actions/auth";

export async function SiteHeader({ country = "gb" }: { country?: string }) {
  const user = await getSession();

  return (
    <header className="sticky top-0 z-40 border-b border-line/80 bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="serif text-xl font-semibold tracking-tight">
          1mileaway
        </Link>
        <nav className="flex items-center gap-3 text-sm font-medium text-ink-soft">
          <Link href={`/${country}/plumbers/catford`} className="hidden sm:inline hover:text-ink">
            Browse nearby
          </Link>
          <Link href="/for-professionals" className="hover:text-ink">
            For professionals
          </Link>
          {user ? (
            <>
              {isAdmin(user.role) ? (
                <Link href="/admin" className="hover:text-ink">
                  Admin
                </Link>
              ) : null}
              <Link href="/professional" className="hover:text-ink">
                Dashboard
              </Link>
              <form action={signOut}>
                <button className="text-ink-soft hover:text-ink" type="submit">
                  Sign out
                </button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn btn-ink px-4 py-2 text-sm">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
