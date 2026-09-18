"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className={className}
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setPending(true);
        void (async () => {
          try {
            const result = await action(formData);
            if (result && "error" in result && result.error) {
              setError(result.error);
              return;
            }
            if (result && "href" in result && result.href) {
              router.push(result.href);
            }
          } catch {
            setError("That did not work. Try again.");
          } finally {
            setPending(false);
          }
        })();
      }}
    >
      <div className={pending ? "pointer-events-none opacity-70" : undefined}>{children}</div>
      {error ? <p className="mt-2 text-sm text-rust">{error}</p> : null}
    </form>
  );
}
