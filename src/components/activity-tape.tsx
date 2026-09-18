function loopItems(items: string[]) {
  const pad = items.length >= 4 ? items : [...items, ...items, ...items];
  return [...pad, ...pad];
}

export function ActivityTape({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  const loop = loopItems(items);

  return (
    <div className="activity-tape" role="status" aria-label="Live marketplace activity">
      <span className="activity-tape-live">Live</span>
      <div className="activity-tape-viewport">
        <div className="activity-tape-track">
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
