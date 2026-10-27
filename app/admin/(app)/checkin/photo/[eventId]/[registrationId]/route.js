import { currentAdmin } from "../../../../../../lib/admin/auth";
import { canSeeWelcomePhoto } from "../../../../../../lib/welcomePhoto.mjs";
import { photoBytesFor, welcomePhotoFor } from "../../../../../../lib/welcomePhotos";

export const dynamic = "force-dynamic";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

/**
 * The welcome photo for one RSVP of one event, for the door team (check-in
 * helpers) and registration viewers. Keyed by the registration, never by a
 * photo id, so it can't be used to browse People photos.
 */
export async function GET(_request, { params }) {
  const admin = await currentAdmin();
  if (!admin || !canSeeWelcomePhoto(admin)) return new Response("Not allowed", { status: 403 });
  const { eventId, registrationId } = await params;
  if (!isUuid(eventId) || !isUuid(registrationId)) return new Response("Not found", { status: 404 });
  const resolved = await welcomePhotoFor(registrationId, eventId);
  const photo = resolved ? await photoBytesFor(resolved) : null;
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(photo.data, {
    headers: { "Content-Type": photo.mime, "Cache-Control": "private, max-age=86400", "X-Content-Type-Options": "nosniff" },
  });
}
