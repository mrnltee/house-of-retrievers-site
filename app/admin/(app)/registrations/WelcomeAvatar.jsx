/** What the door's welcome card will show for this RSVP: their photo, or their initials. */
export default function WelcomeAvatar({ base, eventId, registrationId, resolved, size = 36 }) {
  if (resolved && resolved.source !== "initials") {
    return (
      <img
        className="person-avatar welcome-avatar"
        src={`${base}/checkin/photo/${eventId}/${registrationId}?v=${encodeURIComponent(resolved.version)}`}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        loading="lazy"
      />
    );
  }
  return (
    <span className="person-avatar is-empty welcome-avatar" style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }} aria-hidden="true">
      {resolved?.initials || "?"}
    </span>
  );
}
