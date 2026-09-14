export function PhoneIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.1 2.8c.4-.4 1-.5 1.5-.2l2.2 1.2c.5.3.8.8.7 1.4l-.4 2.4c-.1.5-.4.9-.8 1.1l-1.3.7c.8 1.7 2.1 3.1 3.8 4l.7-1.3c.2-.4.6-.7 1.1-.8l2.4-.4c.6-.1 1.1.2 1.4.7l1.2 2.2c.3.5.2 1.1-.2 1.5l-1.5 1.5c-.4.4-1 .6-1.6.5-3.4-.4-6.6-2.1-9-4.5-2.4-2.4-4.1-5.6-4.5-9-.1-.6.1-1.2.5-1.6L8.1 2.8Z" />
    </svg>
  );
}
