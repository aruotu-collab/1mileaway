"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

export function BackLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();

  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        if (window.history.length < 2) return;
        try {
          if (document.referrer && new URL(document.referrer).origin !== window.location.origin) return;
        } catch {
          return;
        }
        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </a>
  );
}
