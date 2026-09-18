import { radarDot } from "@/lib/radar";

export function MiniRadar({
  distanceMiles,
  live,
  label,
}: {
  distanceMiles: number;
  live?: boolean;
  label: string;
}) {
  const plot = radarDot(distanceMiles);

  return (
    <div
      className="radar-stage radar-mini"
      aria-hidden
      title={label}
    >
      <div className="radar-ring" style={{ inset: "10%" }} />
      <div className="radar-ring" style={{ inset: "28%" }} />
      <div className="radar-ring" style={{ inset: "46%" }} />
      <div className="radar-sweep" />
      <div className="radar-center" />
      <span
        className={`radar-blip ${live ? "radar-blip-live" : ""}`}
        style={{ left: `${plot.left}%`, top: `${plot.top}%` }}
      >
        <span className="radar-dot" />
      </span>
    </div>
  );
}
