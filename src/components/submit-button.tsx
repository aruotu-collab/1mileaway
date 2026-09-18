"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pendingLabel = "Please wait…",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={`${className}${pending ? " btn-pending" : ""}`}
      type="submit"
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
