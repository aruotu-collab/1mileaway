import { createHash, randomBytes } from "crypto";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function hashToken(value: string) {
  return createSha256(value);
}

export function createSha256(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(bytes = 32) {
  return randomBytes(bytes).toString("hex");
}

export function formatMoney(amountMinor: number, currency: string, locale = "en-GB") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

export function minutesAgo(date: Date | null | undefined) {
  if (!date) return null;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 60000));
}

export function formatLocalDateTime(date: Date) {
  return date.toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFreshness(date: Date | null | undefined) {
  const mins = minutesAgo(date);
  if (mins === null) return "not recently confirmed";
  if (mins < 1) return "confirmed just now";
  if (mins === 1) return "confirmed 1 min ago";
  if (mins < 60) return `confirmed ${mins} mins ago`;
  const hours = Math.round(mins / 60);
  return hours === 1 ? "confirmed 1 hour ago" : `confirmed ${hours} hours ago`;
}

export function compassBearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const lat1 = toRad(from.lat);
  const lat2 = toRad(to.lat);
  const dLng = toRad(to.lng - from.lng);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

export function haversineMiles(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 3958.8 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function startOfLocalDay(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const utcGuess = Date.UTC(year, month - 1, day, 0, 0, 0);
  const offset = tzOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

export function endOfLocalDay(timeZone: string, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const utcGuess = Date.UTC(year, month - 1, day, 23, 59, 59);
  const offset = tzOffsetMs(timeZone, new Date(utcGuess));
  return new Date(utcGuess - offset);
}

function tzOffsetMs(timeZone: string, date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value]));
  const asUTC = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUTC - date.getTime();
}

export function maskEmail(email: string) {
  const [user, domain] = email.split("@");
  if (!user || !domain) return email;
  const visible = user.slice(0, 1);
  return `${visible}***@${domain}`;
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function safeNextPath(value: string | null | undefined, fallback = "/professional") {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}
