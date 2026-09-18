"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";
import { countryFromPathname } from "@/lib/countries/catalog";

function navClass(active: boolean) {
  return active
    ? "rounded-full bg-ink px-3 py-1.5 text-paper-strong"
    : "rounded-full px-3 py-1.5 hover:text-ink";
}

function isFindHelpPath(pathname: string) {
  return pathname === "/" || Boolean(countryFromPathname(pathname));
}

export function SiteNav({
  signedIn,
  admin,
  currentPath,
  labels,
}: {
  signedIn: boolean;
  admin: boolean;
  currentPath: string;
  labels: {
    findHelp: string;
    forProfessionals: string;
    signIn: string;
    signOut: string;
    dashboard: string;
    admin: string;
    menu: string;
    close: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const livePath = usePathname();
  const [pathname, setPathname] = useState(currentPath);

  useEffect(() => {
    setPathname(livePath);
    setOpen(false);
  }, [livePath]);

  const findHelp = isFindHelpPath(pathname);
  const forProfessionals = pathname === "/for-professionals" || pathname.startsWith("/for-professionals/") || pathname === "/join";
  const adminActive = pathname === "/admin" || pathname.startsWith("/admin/");
  const dashboard = pathname === "/professional" || pathname.startsWith("/professional/");

  const links = (
    <>
      <Link
        href="/"
        className={navClass(findHelp)}
        aria-current={findHelp ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        {labels.findHelp}
      </Link>
      <Link
        href="/for-professionals"
        className={navClass(forProfessionals)}
        aria-current={forProfessionals ? "page" : undefined}
        onClick={() => setOpen(false)}
      >
        {labels.forProfessionals}
      </Link>
      {signedIn ? (
        <>
          {admin ? (
            <Link
              href="/admin"
              className={navClass(adminActive)}
              aria-current={adminActive ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {labels.admin}
            </Link>
          ) : null}
          <Link
            href="/professional"
            className={navClass(dashboard)}
            aria-current={dashboard ? "page" : undefined}
            onClick={() => setOpen(false)}
          >
            {labels.dashboard}
          </Link>
          <form action={signOut}>
            <button className="rounded-full px-3 py-1.5 text-ink-soft hover:text-ink" type="submit">
              {labels.signOut}
            </button>
          </form>
        </>
      ) : (
        <Link href="/login" className="btn btn-ink px-4 py-2 text-sm" onClick={() => setOpen(false)}>
          {labels.signIn}
        </Link>
      )}
    </>
  );

  return (
    <>
      <nav className="hidden items-center gap-2 text-sm font-medium text-ink-soft sm:flex">{links}</nav>
      <button
        type="button"
        className="rounded-full border border-line px-3 py-2 text-sm font-semibold sm:hidden"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? labels.close : labels.menu}
      </button>
      {open ? (
        <div
          id="site-menu"
          className="absolute inset-x-0 top-full z-50 border-b border-line bg-paper-strong px-4 py-3 shadow-lg sm:hidden"
        >
          <nav className="grid gap-2 text-sm font-medium text-ink">{links}</nav>
        </div>
      ) : null}
    </>
  );
}
