export function normalizeContactEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidContactEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeContactEmail(email));
}

export function cleanContactField(value: string, max: number) {
  return value.replaceAll("\u0000", "").trim().slice(0, max);
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("\n", "<br />");
}

export function contactReplyHtml(input: { name: string; body: string }) {
  return `<p>Hi ${escapeHtml(input.name)},</p>
    <p>${escapeHtml(input.body)}</p>
    <p>1mileaway</p>`;
}
