"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "@/app/actions/auth";

export function SiteNav({
  signedIn,
  admin,
  labels,
}: {
  signedIn: boolean;
  admin: boolean;
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
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const links = (
    <>
      <Link href="/" className="hover:text-ink" onClick={() => setOpen(false)}>
        {labels.findHelp}
      </Link>
      <Link href="/for-professionals" className="hover:text-ink" onClick={() => setOpen(false)}>
        {labels.forProfessionals}
      </Link>
      {signedIn ? (
        <>
          {admin ? (
            <Link href="/admin" className="hover:text-ink" onClick={() => setOpen(false)}>
              {labels.admin}
            </Link>
          ) : null}
          <Link href="/professional" className="hover:text-ink" onClick={() => setOpen(false)}>
            {labels.dashboard}
          </Link>
          <form action={signOut}>
            <button className="text-ink-soft hover:text-ink" type="submit">
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
      <nav className="hidden items-center gap-3 text-sm font-medium text-ink-soft sm:flex">{links}</nav>
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
          <nav className="grid gap-3 text-sm font-medium text-ink">{links}</nav>
        </div>
      ) : null}
    </>
  );
}
