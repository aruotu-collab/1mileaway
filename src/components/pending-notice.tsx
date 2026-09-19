export function PendingNotice({ children }: { children: string }) {
  return (
    <p className="pending-notice" role="status" aria-live="polite">
      <span className="pending-notice-dot" aria-hidden />
      {children}
    </p>
  );
}
