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
    <div className={`radar-stage radar-mini${live ? " radar-mini-live" : ""}`} aria-hidden title={label}>
      <div className="radar-bezel" />
      <div className="radar-face">
        <div className="radar-ticks" />
        <div className="radar-crosshair" />
        <div className="radar-ring" style={{ inset: "14%" }} />
        <div className="radar-ring" style={{ inset: "30%" }} />
        <div className="radar-ring" style={{ inset: "46%" }} />
        <span className="radar-north">N</span>
        <div className="radar-sweep" />
        <div className="radar-center" />
        <span
          className={`radar-blip ${live ? "radar-blip-live" : ""}`}
          style={{ left: `${plot.left}%`, top: `${plot.top}%` }}
        >
          <span className="radar-dot" />
        </span>
      </div>
    </div>
  );
}
