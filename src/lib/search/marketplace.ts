export function marketplaceHref(input: {
  country: string;
  professionSlug: string;
  emergencySlug?: string | null;
  emergency: boolean;
  locationSlug: string;
  near?: { label: string; lat: number; lng: number } | null;
}) {
  const slug = input.emergency && input.emergencySlug ? input.emergencySlug : input.professionSlug;
  const params = new URLSearchParams();
  if (input.near) {
    params.set("near", input.near.label);
    params.set("lat", String(input.near.lat));
    params.set("lng", String(input.near.lng));
  }
  if (input.emergency && !input.emergencySlug) params.set("sort", "available");
  const query = params.toString();
  return `/${input.country}/${slug}/${input.locationSlug}${query ? `?${query}` : ""}`;
}
