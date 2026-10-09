/**
 * Manual donation methods shown in the Support the pack panel, and the rules
 * for changing them.
 */

export const METHODS = {
  gcash: { label: "GCash", fields: [["accountName", "Account name"], ["number", "Mobile number"]], qr: true },
  maya: { label: "Maya", fields: [["accountName", "Account name"], ["number", "Mobile number"]], qr: true },
  qrph: { label: "QR Ph", fields: [["accountName", "Account name"]], qr: true },
  bank: { label: "Bank transfer", fields: [["bankName", "Bank"], ["accountName", "Account name"], ["accountNumber", "Account number"]], qr: false },
};

export const METHOD_KEYS = Object.keys(METHODS);

/** Largest QR image accepted, as decoded bytes. A phone screenshot of a QR is well under this. */
export const MAX_QR_BYTES = 300 * 1024;

const QR_DATA_URL = /^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

const clean = (value, max = 120) => (typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, max) : "");

/** "0917 123 4567", "+63 917 123 4567" → "09171234567" or "" if not a PH mobile number. */
export function normalizeMobile(value) {
  const digits = String(value || "").replace(/[^\d+]/g, "");
  const local = digits.startsWith("+63") ? `0${digits.slice(3)}` : digits.startsWith("63") ? `0${digits.slice(2)}` : digits;
  return /^09\d{9}$/.test(local) ? local : "";
}

/** "09171234567" → "0917 123 4567" */
export function formatMobile(number) {
  return /^09\d{9}$/.test(number) ? `${number.slice(0, 4)} ${number.slice(4, 7)} ${number.slice(7)}` : number;
}

/**
 * Checks a proposed change. A method can always be switched off; switching it
 * on needs every field filled (and a QR image where the method has one).
 * @returns {{ value?: {enabled:boolean, details:object, qrImage:string|null, qrPayload:string|null}, error?: string }}
 */
export function validateChange(key, input) {
  const method = METHODS[key];
  if (!method) return { error: "Unknown payment method." };
  const enabled = input?.enabled === true || input?.enabled === "on" || input?.enabled === "true";
  const details = {};
  for (const [field, label] of method.fields) {
    let value = clean(input?.details?.[field]);
    if (field === "number" && value) {
      value = normalizeMobile(value);
      if (!value) return { error: `${label} must be a PH mobile number, like 0917 123 4567.` };
    }
    if (field === "accountNumber" && value) {
      value = value.replace(/[\s-]/g, "");
      if (!/^\d{6,20}$/.test(value)) return { error: `${label} should be 6 to 20 digits.` };
    }
    if (enabled && !value) return { error: `${label} is needed before ${method.label} can be shown.` };
    details[field] = value;
  }

  let qrImage = null;
  let qrPayload = null;
  if (method.qr && input?.qrImage) {
    const match = String(input.qrImage).match(QR_DATA_URL);
    if (!match) return { error: "The QR image must be a PNG, JPG or WebP file." };
    if (Math.ceil((match[2].length * 3) / 4) > MAX_QR_BYTES) return { error: "The QR image is too large. A screenshot of the QR is enough." };
    qrPayload = clean(input.qrPayload, 1000);
    if (!qrPayload) return { error: "That image doesn't scan as a QR code. Try a sharper screenshot." };
    qrImage = input.qrImage;
  }
  if (enabled && method.qr && key !== "gcash" && key !== "maya" && !qrImage && !input?.hasQr) {
    return { error: `${method.label} needs its QR image before it can be shown.` };
  }
  return { value: { enabled, details, qrImage, qrPayload } };
}

/** Fields that differ between the live row and a request, for the approval screen. */
export function diffChange(current, proposed) {
  const changes = [];
  if (Boolean(current?.enabled) !== Boolean(proposed?.enabled)) changes.push("enabled");
  const keys = new Set([...Object.keys(current?.details || {}), ...Object.keys(proposed?.details || {})]);
  for (const key of keys) if ((current?.details?.[key] || "") !== (proposed?.details?.[key] || "")) changes.push(key);
  if (proposed?.qrImage && proposed.qrImage !== current?.qrImage) changes.push("qrImage");
  return changes;
}

/** Turning a method off can't send money anywhere new, so it skips approval. */
export function needsApproval(current, proposed) {
  const onlyDisabling = !proposed.enabled && diffChange(current, proposed).every((field) => field === "enabled");
  return !onlyDisabling;
}

/** Rows from payment_methods → what the public Support panel may show. */
export function publicMethods(rows) {
  return rows
    .filter((row) => row.enabled)
    .map((row) => ({
      key: row.key,
      label: METHODS[row.key]?.label || row.key,
      details: {
        ...row.details,
        ...(row.details?.number ? { number: formatMobile(row.details.number) } : {}),
      },
      qrImage: row.qr_image || null,
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
    }))
    .sort((a, b) => METHOD_KEYS.indexOf(a.key) - METHOD_KEYS.indexOf(b.key));
}
