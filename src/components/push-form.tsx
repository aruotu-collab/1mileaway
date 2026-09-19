"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { setAppPending } from "@/lib/pending-ui";
import { PendingNotice } from "@/components/pending-notice";

export function PushForm({
  action,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<{ href: string } | { error?: string } | void>;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPending(false);
  }, [pathname]);

  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setPending(true);
        setAppPending(true);
        void (async () => {
          try {
            const result = await action(formData);
            if (result && "error" in result && result.error) {
              setError(result.error);
              setPending(false);
              setAppPending(false);
              return;
            }
            if (result && "href" in result && result.href) {
              router.push(result.href);
              return;
            }
            setPending(false);
            setAppPending(false);
          } catch {
            setError("That did not work. Try again.");
            setPending(false);
            setAppPending(false);
          }
        })();
      }}
    >
      <div className={pending ? "pointer-events-none opacity-70" : undefined}>{children}</div>
      {pending ? <PendingNotice>Please wait…</PendingNotice> : null}
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
    </form>
  );
}
