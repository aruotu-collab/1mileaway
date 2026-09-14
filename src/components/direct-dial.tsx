"use client";

import { useEffect } from "react";

export function DirectDial({ href }: { href: string }) {
  useEffect(() => {
    window.location.href = href;
  }, [href]);
  return null;
}
