export type ListingCsvRow = {
  name: string;
  email: string;
  profession: string;
  location: string;
  website: string;
  phone: string;
  about: string;
  source: string;
  country: string;
};

export function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells.map((cell) => cell.trim());
}

export function parseListingCsv(text: string): ListingCsvRow[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]).map((header) => header.toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = cells[index] ?? "";
    });
    return {
      name: raw.name ?? "",
      email: (raw.email ?? "").toLowerCase(),
      profession: raw.profession ?? "",
      location: raw.location ?? "",
      website: raw.website ?? "",
      phone: raw.phone ?? raw.phonedisplay ?? "",
      about: raw.about ?? "",
      source: raw.source ?? raw.provenance ?? "",
      country: (raw.country ?? "gb").toLowerCase(),
    };
  });
}
