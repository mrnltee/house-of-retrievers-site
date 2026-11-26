/**
 * "A, B, C" → "A, B and C", so an event's beneficiaries read as a sentence on
 * the home page's What moves us card. A comma before Inc., Ltd. or Corp. and
 * commas inside brackets belong to a name and are left alone.
 */
export function supportsLine(text = "") {
  const clean = String(text ?? "").trim();
  const parts = clean.split(/,(?!\s*(?:Inc|Ltd|Corp)\b)(?![^()]*\))/).map((part) => part.trim()).filter(Boolean);
  if (parts.length < 2) return clean;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
