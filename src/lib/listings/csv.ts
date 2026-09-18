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
  postcode: string;
};

const HEADER_ALIASES: Record<string, keyof ListingCsvRow> = {
  name: "name",
  business: "name",
  "business name": "name",
  company: "name",
  "company name": "name",
  "trading name": "name",
  tradesman: "name",
  email: "email",
  "e-mail": "email",
  "work email": "email",
  profession: "profession",
  trade: "profession",
  trades: "profession",
  category: "profession",
  service: "profession",
  location: "location",
  town: "location",
  city: "location",
  area: "location",
  "city area": "location",
  district: "location",
  locality: "location",
  website: "website",
  url: "website",
  web: "website",
  site: "website",
  phone: "phone",
  telephone: "phone",
  tel: "phone",
  mobile: "phone",
  number: "phone",
  "phone number": "phone",
  phonedisplay: "phone",
  about: "about",
  description: "about",
  notes: "about",
  source: "source",
  provenance: "source",
  country: "country",
  postcode: "postcode",
  "post code": "postcode",
  zip: "postcode",
};

const LOCATION_HEADER_PRIORITY = ["city area", "town", "city", "area", "district", "locality", "location"];

const COUNTRY_ALIASES: Record<string, string> = {
  gb: "gb",
  uk: "gb",
  "united kingdom": "gb",
  "great britain": "gb",
  england: "gb",
  scotland: "gb",
  wales: "gb",
};

function normalizeHeader(header: string) {
  return header.replace(/^\uFEFF/, "").trim().toLowerCase().replace(/[_/]+/g, " ").replace(/\s+/g, " ");
}

function normalizeCountry(value: string) {
  const term = value.trim().toLowerCase();
  if (!term) return "gb";
  return COUNTRY_ALIASES[term] ?? (term.length === 2 ? term : "gb");
}

function firstValue(value: string) {
  return value.split("/")[0].trim();
}

export function listingRowFromRaw(raw: Record<string, string>): ListingCsvRow {
  const mapped: Partial<Record<keyof ListingCsvRow, string>> = {};
  const locations: { header: string; value: string }[] = [];
  for (const [header, value] of Object.entries(raw)) {
    const normalized = normalizeHeader(header);
    const field = HEADER_ALIASES[normalized];
    if (!field) continue;
    const trimmed = value.trim();
    if (!trimmed) continue;
    if (field === "location") {
      locations.push({ header: normalized, value: trimmed });
      continue;
    }
    if (!mapped[field]) mapped[field] = trimmed;
  }
  const preferredLocation = LOCATION_HEADER_PRIORITY.map((header) => locations.find((row) => row.header === header)).find(
    Boolean,
  );
  const source = mapped.source ?? "";
  return {
    name: mapped.name ?? "",
    email: (mapped.email ?? "").toLowerCase(),
    profession: firstValue(mapped.profession ?? ""),
    location: firstValue(preferredLocation?.value ?? ""),
    website: mapped.website ?? "",
    phone: firstValue(mapped.phone ?? ""),
    about: mapped.about ?? "",
    source: /^https?:\/\//i.test(source) ? "" : source,
    country: normalizeCountry(mapped.country ?? "gb"),
    postcode: mapped.postcode ?? "",
  };
}

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
  const headers = splitCsvLine(lines[0]);
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const raw: Record<string, string> = {};
    headers.forEach((header, index) => {
      raw[header] = cells[index] ?? "";
    });
    return listingRowFromRaw(raw);
  });
}

export async function parseListingSpreadsheet(buffer: Buffer, filename: string): Promise<ListingCsvRow[]> {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
    return parseListingCsv(buffer.toString("utf8"));
  }
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];
  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = String(cell.text ?? "").trim();
  });
  const rows: ListingCsvRow[] = [];
  sheet.eachRow((row, index) => {
    if (index === 1) return;
    const raw: Record<string, string> = {};
    headers.forEach((header, col) => {
      if (!header) return;
      raw[header] = String(row.getCell(col).text ?? "").trim();
    });
    const parsed = listingRowFromRaw(raw);
    if (parsed.name || parsed.profession || parsed.location) rows.push(parsed);
  });
  return rows;
}
