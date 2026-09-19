"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isAppPending, setAppPending, subscribeAppPending } from "@/lib/pending-ui";

export function NavigationProgress() {
  const pathname = usePathname();
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setPending(isAppPending());
    const unsubscribe = subscribeAppPending(setPending);
    function onPending(event: Event) {
      setPending(Boolean((event as CustomEvent<boolean>).detail));
    }
    window.addEventListener("oma:pending", onPending);
    return () => {
      unsubscribe();
      window.removeEventListener("oma:pending", onPending);
    };
  }, []);

  useEffect(() => {
    if (!isAppPending()) return;
    const timer = window.setTimeout(() => setAppPending(false), 450);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const link = (event.target as HTMLElement | null)?.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target && link.target !== "_self") return;
      if (link.hasAttribute("download")) return;
      try {
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        if (`${url.pathname}${url.search}` === `${window.location.pathname}${window.location.search}`) return;
      } catch {
        return;
      }
      setAppPending(true);
    }

    function onSubmit(event: Event) {
      queueMicrotask(() => {
        if (event.defaultPrevented) return;
        setAppPending(true);
      });
    }

    document.addEventListener("click", onClick);
    document.addEventListener("submit", onSubmit);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("submit", onSubmit);
    };
  }, []);

  useEffect(() => {
    if (!pending) return;
    const timer = window.setTimeout(() => setAppPending(false), 12000);
    return () => window.clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;

  return (
    <div className="navigation-progress" role="status" aria-live="polite">
      <p className="navigation-progress-label">Searching… please wait</p>
      <span className="navigation-progress-bar" />
    </div>
  );
}
