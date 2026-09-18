export type ProfessionChoice = {
  slug: string;
  label: string;
  category: string;
  categoryOrder: number;
};

export type ProfessionPick = ProfessionChoice & { id: string };

export function displayCategoryName(slug: string, name: string) {
  if (slug === "home-emergency") return "Home & repairs";
  return name;
}

export function groupedProfessions<T extends ProfessionChoice>(professions: T[]) {
  const groups = new Map<string, { name: string; order: number; items: T[] }>();
  for (const profession of professions) {
    const name = profession.category.trim() || "Other";
    const existing = groups.get(name) ?? { name, order: profession.categoryOrder, items: [] };
    existing.items.push(profession);
    groups.set(name, existing);
  }
  return [...groups.values()].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

export function uniqueProfessionIds(values: string[]) {
  const seen = new Set<string>();
  for (const value of values) {
    const id = value.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
  }
  return [...seen];
}

export function parseProfessionIds(value: FormDataEntryValue[] | string | string[] | null | undefined) {
  if (value == null) return [];
  const parts = Array.isArray(value) ? value.map(String) : String(value).split(",");
  return uniqueProfessionIds(parts);
}

export function claimCompletePath(token: string, professionIds: string[] = []) {
  const params = new URLSearchParams({ token });
  const ids = uniqueProfessionIds(professionIds);
  if (ids.length) params.set("professions", ids.join(","));
  return `/claim/complete?${params.toString()}`;
}
