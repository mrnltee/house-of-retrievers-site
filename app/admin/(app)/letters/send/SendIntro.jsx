/** The notes above the send form, on the page and in the send window: the event it's for, and letter mismatches. */
export function SendIntro({ data, base }) {
  const { event, listName, mismatched } = data;
  const listHref = event ? (listName === "registrations" ? `${base}/registrations/${event.id}` : `${base}/events/${event.id}/${["guests", "donors"].includes(listName) ? listName : "brands"}`) : "";
  const listLabel = listName === "registrations" ? "Registrations" : listName === "guests" ? "Guest list" : listName === "donors" ? "Donors" : "Brand tracker";
  return (
    <>
      {event && <p className="card small">For <strong>{event.title}</strong>: these letters are tracked on its <a href={listHref}>{listLabel}</a>, and its details fill in [Event Name], [Event Date], [Event Sponsors] and the other event fill-ins.</p>}
      {mismatched.length > 0 && <p className="card" role="alert" style={{ borderLeft: "4px solid #b8860b" }}>Check the letter: {mismatched.map((r) => `${r.name} (${r.note})`).join(", ")} {mismatched.length === 1 ? "is" : "are"} usually sent a different letter.</p>}
    </>
  );
}
