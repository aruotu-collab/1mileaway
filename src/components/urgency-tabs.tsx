import Link from "next/link";

type Tab = {
  href?: string;
  label: string;
  selected: boolean;
  onSelect?: () => void;
};

function TabButton({ tab }: { tab: Tab }) {
  const className = tab.selected
    ? "flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold bg-ink text-paper-strong"
    : "flex-1 rounded-full px-4 py-2.5 text-center text-sm font-semibold text-ink-soft hover:text-ink";

  if (tab.href) {
    return (
      <Link href={tab.href} className={className} role="tab" aria-selected={tab.selected}>
        {tab.label}
      </Link>
    );
  }

  return (
    <button type="button" className={className} role="tab" aria-selected={tab.selected} onClick={tab.onSelect}>
      {tab.label}
    </button>
  );
}

export function UrgencyTabs({
  emergency,
  regularHref,
  emergencyHref,
  onChange,
}: {
  emergency: boolean;
  regularHref?: string;
  emergencyHref?: string;
  onChange?: (next: boolean) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Urgency"
      className="grid grid-cols-2 rounded-full border border-line bg-paper p-1"
    >
      <TabButton
        tab={{
          label: "Nearest to you",
          selected: !emergency,
          href: regularHref,
          onSelect: onChange ? () => onChange(false) : undefined,
        }}
      />
      <TabButton
        tab={{
          label: "Emergency",
          selected: emergency,
          href: emergencyHref,
          onSelect: onChange ? () => onChange(true) : undefined,
        }}
      />
    </div>
  );
}
