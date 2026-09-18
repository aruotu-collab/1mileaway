import { isUkPostcode } from "@/lib/locations/geocode";

export type LocationChoice = {
  slug: string;
  name: string;
};

export function filterLocationSuggestions(locations: LocationChoice[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return locations;
  if (locations.some((location) => location.name.toLowerCase() === q)) return locations;
  if (isUkPostcode(query)) return locations;
  const slugQuery = q.replace(/\s+/g, "-");
  const matches = locations.filter(
    (location) => location.name.toLowerCase().includes(q) || location.slug.includes(slugQuery),
  );
  return matches.length > 0 ? matches : locations;
}

export function locationTypedHint(query: string, matches: LocationChoice[]) {
  const q = query.trim();
  if (!q) return null;
  if (matches.some((location) => location.name.toLowerCase() === q.toLowerCase())) return null;
  if (isUkPostcode(q)) return `Use ${q.toUpperCase()} as a postcode`;
  return `Use “${q}” as a postcode or street address`;
}
