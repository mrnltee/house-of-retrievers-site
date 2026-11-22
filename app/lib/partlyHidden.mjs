/**
 * Payment settings can show a number partly hidden on public pages
 * ("091 •••••• 08", `maskMobile` / `maskAccountNumber` in admin/payments.mjs).
 * A Copy button on such a number would paste the dots, so the Support window and
 * the payment step offer the QR instead (audit, 22 Nov 2026).
 */
export function isPartlyHidden(value) {
  return /[•*]/.test(String(value ?? ""));
}
