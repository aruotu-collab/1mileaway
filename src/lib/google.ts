export function googleMeasurementId(value = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID) {
  const id = value?.trim() ?? "";
  return /^G-[A-Z0-9]+$/i.test(id) ? id.toUpperCase() : null;
}

export function googleSiteVerification(value = process.env.GOOGLE_SITE_VERIFICATION) {
  const token = value?.trim() ?? "";
  return /^[A-Za-z0-9_-]+$/.test(token) ? token : null;
}

export function shouldLoadGoogleAnalytics() {
  if (!googleMeasurementId()) return false;
  if (process.env.NEXT_PUBLIC_GA_DEBUG === "1") return true;
  return process.env.VERCEL_ENV === "production";
}
