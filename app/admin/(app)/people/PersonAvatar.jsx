/** A person's Join-form photo (admin-only route), or their initials. */
const initials = (name) => String(name || "?").split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

export default function PersonAvatar({ person, base, size = 44 }) {
  return person.photo_id ? (
    <img className="person-avatar" src={`${base}/people/photo/${person.photo_id}`} alt="" width={size} height={size} loading="lazy" />
  ) : (
    <span className="person-avatar is-empty" style={{ width: size, height: size }} aria-hidden="true">{initials(person.name)}</span>
  );
}

