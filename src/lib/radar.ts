import { compassBearing, haversineMiles } from "@/lib/utils";

export type RadarPlotInput = {
  id: string;
  distanceMiles: number;
  lat?: number | null;
  lng?: number | null;
};

export function fallbackAngle(id: string, index: number) {
  let n = index * 47;
  for (let i = 0; i < id.length; i += 1) n += id.charCodeAt(i) * (i + 1);
  return n % 360;
}

function hasUsefulBearing(item: RadarPlotInput, origin?: { lat: number; lng: number } | null) {
  if (!origin || item.lat == null || item.lng == null) return false;
  return haversineMiles(origin, { lat: item.lat, lng: item.lng }) > 0.08;
}

export function radarPlots(
  items: RadarPlotInput[],
  origin?: { lat: number; lng: number } | null,
) {
  const maxMiles = Math.max(1.5, ...items.map((item) => item.distanceMiles), 3);
  const preferred = items.map((item, index) => ({
    index,
    angle: hasUsefulBearing(item, origin)
      ? compassBearing(origin!, { lat: item.lat!, lng: item.lng! })
      : fallbackAngle(item.id, index),
  }));
  preferred.sort((a, b) => a.angle - b.angle || a.index - b.index);

  const angles = new Array<number>(items.length);
  preferred.forEach((row, slot) => {
    angles[row.index] = ((slot * 360) / Math.max(items.length, 1) + 22) % 360;
  });

  return items.map((item, index) => {
    const radius = 24 + (Math.min(item.distanceMiles, maxMiles) / maxMiles) * 20;
    const radians = (angles[index] * Math.PI) / 180;
    return {
      id: item.id,
      left: Math.min(86, Math.max(14, 50 + radius * Math.sin(radians))),
      top: Math.min(86, Math.max(14, 50 - radius * Math.cos(radians))),
    };
  });
}

export function radarDot(distanceMiles: number, maxMiles = 3) {
  const cap = Math.max(maxMiles, 1.5);
  const radius = 18 + (Math.min(Math.max(distanceMiles, 0), cap) / cap) * 26;
  const radians = (42 * Math.PI) / 180;
  return {
    left: 50 + radius * Math.sin(radians),
    top: 50 - radius * Math.cos(radians),
  };
}
