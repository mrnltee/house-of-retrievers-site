/**
 * How /api/event-image may send a stored picture. Public pictures (event
 * posters, brand and beneficiary logos, photographers, email designs) are
 * cached by everyone for a year: a new upload always gets a new id. Private
 * ones (letter signature, Guest list, admin profiles) go to signed-in admins
 * only, kept in that admin's browser and never in a shared cache.
 */
export function imageAccess({ isPrivate, isAdmin }) {
  if (!isPrivate) return { ok: true, cache: "public, max-age=31536000, s-maxage=31536000, immutable" };
  if (!isAdmin) return { ok: false };
  return { ok: true, cache: "private, max-age=3600" };
}
