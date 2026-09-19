function loopItems(items: string[]) {
  const pad = items.length >= 4 ? items : [...items, ...items, ...items];
  return [...pad, ...pad];
}

export function ActivityTape({
  items,
  liveLabel,
  ariaLabel,
}: {
  items: string[];
  liveLabel: string;
  ariaLabel: string;
}) {
  const lines = items.length > 0 ? items : [ariaLabel];
  const loop = loopItems(lines);
  const seconds = Math.max(36, items.length * 5);

  return (
    <div className="activity-tape" role="status" aria-label={ariaLabel}>
      <span className="activity-tape-live">
        <span className="hidden sm:inline">{liveLabel}</span>
      </span>
      <div className="activity-tape-viewport">
        <div className="activity-tape-track" style={{ animationDuration: `${seconds}s` }}>
          {loop.map((item, index) => (
            <span key={`${item}-${index}`} className="activity-tape-item">
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
