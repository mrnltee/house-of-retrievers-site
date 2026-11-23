import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { sql } from "../../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { CONTACT_CATEGORIES, categoryOf, letterEmails, roleForSpecification } from "../../../../../lib/contacts.mjs";
import { recipientFields } from "../../../../../lib/letters.mjs";
import { GUEST_SORTS, REPLIES, replyLabel, sortTracker, trackerCounts, trackerSort } from "../../../../../lib/eventBrands.mjs";
import { guestFollowUpLink, guestInviteLetter, guestMessageBase, guestRowLinks } from "../../../../../lib/eventGuestTracker.mjs";
import { INTRO_MAX, ROLE_MAX, SPEAKER_ROLES } from "../../../../../lib/eventSpeakers.mjs";
import { groupLetters, listLetters } from "../../../../../lib/letterStore";
import { refreshSends, sendsFor } from "../../../../../lib/letterSendsStore";
import { addComingGuestsToRsvps, addGuestsToEvent, removeEventGuest, saveContact, saveEventGuest, setEventGuestOnPage, setEventGuestReply } from "../../../../contactActions";
import { Flash, NotAllowed, PageHead, formatDay } from "../../../ui";
import ImageField, { Avatar } from "../../../ImageField";
import ConfirmButton from "../../../ConfirmButton";
import SendStatus from "../../../SendStatus";
import EditDialog from "../../../EditDialog";
import ContactFields from "../../../guests/ContactFields";
import TrackerTools from "../brands/TrackerTools";
import SelectionBar from "../brands/SelectionBar";
import SelectAll from "../brands/SelectAll";
import Icon from "../../../../../components/Icon";
import { compLabel } from "../../../../../lib/compTickets.mjs";
import { compTypeForGuest } from "../../../../../lib/guestRsvp.mjs";
import HowTo from "../../../HowTo";
import { GUEST_GUIDES } from "../../../../../lib/admin/howToGuides.mjs";

const greetingOf = (f) => f.salutation || f.contact || f.name;
const replyTone = { yes: "good", no: "alert", waiting: "" };
const REPLY_ICON = { waiting: "hourglass", yes: "thumbsUp", no: "thumbsDown" };
const guestReply = (reply) => (reply === "yes" ? "Coming" : reply === "no" ? "Can't make it" : replyLabel(reply));
/** What a reply change does to the RSVP list, for the confirm dialog. */
function rsvpNote(r, to) {
  if (to === "yes") return r.on_rsvps ? ["They're already on the RSVP list"] : [`They're added to the RSVP list as a complimentary ${compLabel(compTypeForGuest(r))} (no fee, outside capacity), unless someone with the same name is already on it`];
  if (r.reply === "yes" && r.on_rsvps) return [r.rsvp_checked_in ? "Their RSVP stays: they've checked in" : "If the tracker added their RSVP, it's cancelled; an RSVP they made themselves stays"];
  return [];
}

const GUEST_LABELS = { yes: "Coming", no: "Can't make it", waiting: "No reply yet", unsent: "No invite sent" };

/**
 * An event's Guest tracker (owner, 2026-11-17; before that a guest list grouped by category): politicians,
 * speakers, celebrities, VIPs, creators and media invited to this event in one list, built like the Brand
 * tracker. Search, reply filters and sort; tick guests to send one letter or a message to several; each guest
 * has Invite (their letter), Follow up (once invited, while No reply yet) and Message (write your own email).
 * Edit opens their reply, notes and "On the event page" (speakers & special guests) in a window.
 */
export default async function EventGuestsPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("guests:view");
  if (!allowed) return <NotAllowed />;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [event] = await sql("SELECT id, title, date FROM events WHERE id = $1", [id]);
  if (!event) notFound();
  const base = await adminBase();
  const canEdit = can(admin, "guests:edit");
  const canSend = canEdit && can(admin, "letters:edit");
  const [guests, others, letters, chosen] = await Promise.all([
    sql(`SELECT c.*, eg.reply, eg.notes AS event_notes, eg.show_on_site, eg.public_role, eg.public_intro, eg.public_photo, eg.public_link,
           reg.id AS rsvp_id, reg.comp_type AS rsvp_comp, reg.checked_in_at AS rsvp_checked_in,
           (reg.id IS NOT NULL AND reg.deleted_at IS NULL AND reg.status <> 'cancelled') AS on_rsvps
          FROM event_guests eg JOIN letter_contacts c ON c.id = eg.contact_id LEFT JOIN registrations reg ON reg.id = eg.registration_id
          WHERE eg.event_id = $1 AND c.deleted_at IS NULL ORDER BY lower(c.name)`, [event.id]),
    sql(`SELECT id, name, organization, specification, category, email FROM letter_contacts c WHERE deleted_at IS NULL
          AND NOT EXISTS (SELECT 1 FROM event_guests eg WHERE eg.event_id = $1 AND eg.contact_id = c.id) ORDER BY lower(name)`, [event.id]),
    listLetters(),
    groupLetters(),
  ]);
  const refs = guests.map((g) => `contact:${g.id}`);
  await refreshSends(refs);
  const sends = await sendsFor(refs, { eventId: event.id });
  const letterName = (key) => letters.find((l) => l.key === key)?.name || key;
  const eventLetter = letters.find((l) => l.eventId === event.id)?.key || "";
  const inviteOf = (r) => guestInviteLetter(r, { eventLetter, chosen });
  // Ticking several sends one letter: this event's own, else the special-guests invitation (switchable in the window).
  const bulkLetter = eventLetter || guestInviteLetter({ category: "vip" }, { chosen });
  const sendsOf = (r) => sends[`contact:${r.id}`] || [];
  const wasSent = (r) => sendsOf(r).some((x) => !["failed", "bounced"].includes(x.status));
  const lastSent = (r) => sendsOf(r).reduce((max, x) => (!max || new Date(x.sent_at) > new Date(max) ? x.sent_at : max), null);
  const counts = trackerCounts(guests);
  const onPage = guests.filter((g) => g.show_on_site && g.reply === "yes").length;
  const notOnRsvps = guests.filter((g) => g.reply === "yes" && !g.on_rsvps);
  const followUp = guestFollowUpLink(base, event.id, guests, wasSent);
  const sort = trackerSort(query?.sort || (await cookies()).get("tracker_sort")?.value, GUEST_SORTS);
  // Groups in the Guest list's category order; a guest whose category isn't known goes last, as Other.
  const groupKey = (r) => (categoryOf(r.category) ? r.category : "other");
  const groupRank = (r) => { const i = CONTACT_CATEGORIES.findIndex((c) => c.key === r.category); return i === -1 ? CONTACT_CATEGORIES.length : i; };
  const sorted = sortTracker(guests, sort, lastSent, { groupRank });
  const groups = [...CONTACT_CATEGORIES.map((c) => [c.key, c.label]), ["other", "Other"]]
    .map(([key, label]) => [key, label, guests.filter((g) => groupKey(g) === key).length])
    .filter(([, , n]) => n > 0);
  const categoryLabel = (key) => categoryOf(key)?.label || "Other";
  const searchText = (r) => [r.name, r.organization, r.specification, categoryLabel(r.category), r.email, r.rep_name, r.rep_email, guestReply(r.reply), r.public_role, ...sendsOf(r).slice(0, 1).flatMap((x) => [letterName(x.letter_key), x.status])].filter(Boolean).join(" ");

  return (
    <>
      <p className="small"><a href={`${base}/events/${event.id}`}><Icon name="arrowLeft" /> {event.title}</a></p>
      <PageHead title="Guest tracker" lead={`${event.date ? formatDay(event.date) : "Date to be set"} · who you invited, their reply, and who shows on the event page.`}>
        <HowTo guide="guest-invite" guides={GUEST_GUIDES} label="How emails work" className="btn ghost" />
        {can(admin, "letters:view") && <a className="btn ghost" href={`${base}/events/${event.id}/letters`}>Letters</a>}
        {canSend && followUp.href && <a className="btn ghost" href={followUp.href} title={`Email the ${followUp.count} guest${followUp.count === 1 ? "" : "s"} who had an invite and haven't replied. You can untick people and edit the wording before it's sent.${followUp.noEmail ? ` ${followUp.noEmail} ${followUp.noEmail === 1 ? "has" : "have"} no email yet.` : ""}`}>Follow up · {followUp.count}</a>}
        {canEdit && others.length > 0 && (
          <EditDialog label="+ Add from earlier lists" buttonClass="btn ghost" title="Add from earlier guest lists" lead="People already in your guests, from other events. Tick who to invite to this event; nothing is emailed.">
            <form action={addGuestsToEvent} className="form">
              <input type="hidden" name="event" value={event.id} />
              {CONTACT_CATEGORIES.filter((c) => others.some((o) => o.category === c.key)).map((c) => (
                <fieldset key={c.key} className="plain">
                  <legend>{c.label}</legend>
                  <ul className="tracker-pick">
                    {others.filter((o) => o.category === c.key).map((o) => (
                      <li key={o.id}><label className="check"><input type="checkbox" name="contact" value={o.id} /> <span>{o.name}{o.specification ? <span className="small muted"> · {o.specification}</span> : null}{o.organization ? <span className="small muted"> · {o.organization}</span> : null}{!o.email && <span className="small muted"> · no email yet</span>}</span></label></li>
                    ))}
                  </ul>
                </fieldset>
              ))}
              <div className="actions"><ConfirmButton className="btn dark" title="Add them to this event?" items={["They show on this tracker as No reply yet.", "Nothing is emailed."]}>Add to this event</ConfirmButton></div>
            </form>
          </EditDialog>
        )}
        {canEdit && (
          <EditDialog label="+ Add a guest" buttonClass="btn gold" title="Add a guest" lead={`New to your guests. They're added to ${event.title} as No reply yet.`}>
            <form action={saveContact} className="form">
              <input type="hidden" name="event" value={event.id} />
              <ContactFields category={query?.category || ""} />
              <div className="actions"><ConfirmButton className="btn dark" title="Add to this event's guests?" items={["They show on this tracker, ready for a letter.", "Nothing is emailed."]}>Add to the guest list</ConfirmButton></div>
            </form>
          </EditDialog>
        )}
      </PageHead>
      <Flash params={query} />
      {canEdit && notOnRsvps.length > 0 && (
        <form action={addComingGuestsToRsvps} className="banner rsvp-banner">
          <input type="hidden" name="event" value={event.id} />
          <div><strong>{notOnRsvps.length} Coming {notOnRsvps.length === 1 ? "guest isn't" : "guests aren't"} on the RSVP list yet</strong><p className="small">{notOnRsvps.map((g) => g.name).join(", ")}. From now on, marking someone Coming adds them by itself.</p></div>
          <ConfirmButton className="btn gold" title={`Add ${notOnRsvps.length} Coming ${notOnRsvps.length === 1 ? "guest" : "guests"} to the RSVP list?`} items={["Each is added once as a complimentary Guest or VIP: no fee, outside capacity", "Anyone already on the RSVP list with the same name is linked, not added twice", "Nothing is emailed"]} yes="Yes, add them">Add to the RSVP list · {notOnRsvps.length}</ConfirmButton>
        </form>
      )}

      <section className="card tracker-page">
        <form id="tracker-send" method="get" action={`${base}/letters/send`}>
          <input type="hidden" name="letter" value={bulkLetter} />
          <input type="hidden" name="event" value={event.id} />
          <input type="hidden" name="list" value="guests" />
        </form>
        {guests.length > 0 && (
          <TrackerTools
            counts={{ ...counts, unsent: guests.filter((r) => sendsOf(r).length === 0).length }}
            sort={sort}
            labels={GUEST_LABELS}
            noun="guests"
            sorts={GUEST_SORTS}
            groups={groups}
            placeholder="Search guests…"
            searchTitle="Searches name, organization, group, email, role and letter"
            publicNote={`${onPage} shown on the event page. Guests appear there once they're Coming and their Event page switch is on.`}
          />
        )}
        {canSend && guests.length > 0 && (
          <SelectionBar
            hint="Tick guests to send one letter or message to several at once."
            letterHref={`${base}/letters/${bulkLetter}`}
            letterName={letterName(bulkLetter)}
            ownLetterHref={`${base}/events/${event.id}/letters`}
            messageBase={guestMessageBase(base, event.id)}
          />
        )}
        <div className="table-wrap tracker-table">
          <table className="stack-table">
            <thead><tr>{canSend && <th>{guests.length > 0 ? <SelectAll label="Pick every guest showing" /> : <span className="sr-only">Pick</span>}</th>}<th>Guest</th><th>Contact</th><th>Letters</th><th>Their reply</th></tr></thead>
            <tbody id="tracker-rows">
              {sorted.map((r) => {
                const links = guestRowLinks(base, event.id, r, inviteOf(r), { sent: wasSent(r) });
                return (
                  <tr key={r.id} data-row="" data-group={groupKey(r)} data-reply={r.reply} data-sent={sendsOf(r).length ? "yes" : "no"} data-search={searchText(r)}>
                    {canSend && <td className="st-pick"><input type="checkbox" form="tracker-send" name="to" value={`contact:${r.id}`} aria-label={`Pick ${r.name}`} /></td>}
                    <td className="strong st-1">
                      <span className="row-name"><Avatar photo={r.photo} logo={r.logo} name={r.name} /><span><a href={`${base}/guests/${r.id}?event=${event.id}`}>{r.name}</a>{(r.specification || r.organization) && <><br /><span className="small muted">{[r.specification, r.organization].filter(Boolean).join(" · ")}</span></>}<br /><span className="small muted guest-group">{categoryLabel(r.category)}</span></span></span>
                      {canEdit && (
                        <EditDialog label="Edit details" buttonClass="btn small ghost" title={r.name} lead={`At ${event.title}: their reply, your notes, and whether they show on the event page.`}>
                          <form action={saveEventGuest} className="form">
                            <input type="hidden" name="event" value={event.id} />
                            <input type="hidden" name="contact" value={r.id} />
                            <label className="field"><span>Their reply</span><select name="reply" defaultValue={r.reply}>{REPLIES.map(([k]) => <option key={k} value={k}>{guestReply(k)}</option>)}</select></label>
                            <label className="field"><span>Notes for this event <small>Only admins see these</small></span><textarea name="notes" rows={2} maxLength={1000} defaultValue={r.event_notes || ""} /></label>
                            <details className="guest-public-fold" open={r.show_on_site || undefined}>
                            <summary className="strong">On the event page <span className="small muted">{r.show_on_site ? (r.reply === "yes" ? "· shown" : "· waiting for Coming") : "· not shown"}</span></summary>
                            <fieldset className="plain guest-public">
                              <input type="hidden" name="publicSent" value="1" />
                              <label className="check"><input type="checkbox" name="showOnSite" value="1" defaultChecked={r.show_on_site} /> <span>Show {r.name} under Speakers and special guests <small className="muted">(only once their reply is Coming, and only with their OK)</small></span></label>
                              <p className="small muted" style={{ margin: 0 }}>The page shows only what you fill in here: their name, role, intro, this picture and one link. Never their email, phone, notes or the photo on their guest record.</p>
                              <label className="field"><span>Role <small>e.g. Guest speaker, Host, Special guest</small></span><input name="publicRole" list={`roles-${r.id}`} maxLength={ROLE_MAX} defaultValue={r.public_role || roleForSpecification(r.specification)} /><datalist id={`roles-${r.id}`}>{SPEAKER_ROLES.map((x) => <option key={x} value={x} />)}</datalist></label>
                              <label className="field"><span>Intro <small>One or two lines, up to {INTRO_MAX} characters</small></span><textarea name="publicIntro" rows={2} maxLength={INTRO_MAX} defaultValue={r.public_intro || ""} /></label>
                              <ImageField name="publicPhoto" label="Picture for the event page" hint="A photo they're happy to have public. Square works best." current={r.public_photo || ""} round maxEdge={600} />
                              <label className="field"><span>Link <small>Their Instagram (@handle) or a https:// page</small></span><input name="publicLink" maxLength={300} defaultValue={r.public_link || ""} /></label>
                            </fieldset>
                            </details>
                            <div className="actions">
                              <ConfirmButton className="btn dark" title={`Save ${r.name} for this event?`} items={["Their reply and notes, for this event only.", "Coming puts them on the RSVP list once, as a complimentary guest; a changed reply takes off only the RSVP the tracker added (never after check-in).", "If “Show on the event page” is ticked and they're Coming, their name, role, intro, picture and link appear on the public event page."]}>Save</ConfirmButton>
                              <ConfirmButton className="btn ghost" formAction={removeEventGuest} tone="alert" title={`Take ${r.name} off this event?`} items={["They stay in your guests for other events.", "Letters already sent stay in the log."]}>Remove from this event</ConfirmButton>
                            </div>
                          </form>
                        </EditDialog>
                      )}
                    </td>
                    <td className="st-4" data-label="Contact">{letterEmails(r).to || <span className="muted">No email yet</span>}{r.rep_name && <><br /><span className="small muted">Rep: {r.rep_name}{r.send_to !== "person" ? " (gets letters)" : ""}</span></>}<br /><span className="small muted">Dear {greetingOf(recipientFields({ contact: r }))},</span></td>
                    <td className="small st-5" data-label="Letters">
                      {sendsOf(r).length ? <SendStatus sends={sendsOf(r)} letterName={letterName} usual={inviteOf(r)} name={r.name} /> : <span className="small muted">Not invited yet</span>}
                      {canSend && (
                        <span className="tracker-row-actions">
                          {links.followUp && <a className="btn small dark" href={links.followUp} title={`Email ${r.name} the follow-up. You can edit the wording before it's sent.`}>Follow up</a>}
                          <a className={`btn small ${wasSent(r) ? "ghost" : "dark"}`} href={links.invite} title={`Open ${letterName(inviteOf(r))} for ${r.name}`}>{wasSent(r) ? "Invite again" : "Invite"}</a>
                          <a className="btn small ghost" href={links.message} title={`Write your own email to ${r.name}`}>Message</a>
                        </span>
                      )}
                    </td>
                    <td className="st-2" data-label="Their reply">
                      {canEdit ? (
                        <span className="reply-quick reply-icons" role="group" aria-label={`${r.name}'s reply`}>
                          {REPLIES.map(([k]) => (k === r.reply
                            ? <span key={k} className={`reply-opt is-on ${replyTone[k]}`.trim()} aria-current="true" title={`Their reply: ${guestReply(k)}`}><Icon name={REPLY_ICON[k]} label={guestReply(k)} /></span>
                            : (
                              <form key={k} action={setEventGuestReply}>
                                <input type="hidden" name="event" value={event.id} />
                                <input type="hidden" name="contact" value={r.id} />
                                <input type="hidden" name="reply" value={k} />
                                <ConfirmButton className="reply-opt" tone="ghost" yes={`Yes, ${guestReply(k)}`} title={`${r.name}: ${guestReply(k)}?`}
                                  items={[`Their reply for ${event.title}: ${guestReply(r.reply)} → ${guestReply(k)}`, ...rsvpNote(r, k), ...(r.show_on_site ? [k === "yes" ? "They'll show on the event page" : "They'll be taken off the event page until they're Coming"] : []), "Nothing is emailed"]} buttonLabel={`Mark ${guestReply(k)}`}><Icon name={REPLY_ICON[k]} /></ConfirmButton>
                              </form>
                            )))}
                        </span>
                      ) : <span className={`chip ${replyTone[r.reply]}`.trim()}>{guestReply(r.reply)}</span>}{r.on_rsvps && <><br /><a className="small" href={`${base}/registrations/${event.id}/r/${r.rsvp_id}`}>{r.rsvp_checked_in ? "Checked in" : "On the RSVP list"}{r.rsvp_comp ? ` · ${compLabel(r.rsvp_comp)}` : ""}</a></>}{canEdit ? (
                        <form action={setEventGuestOnPage} className="onpage-form">
                          <input type="hidden" name="event" value={event.id} />
                          <input type="hidden" name="contact" value={r.id} />
                          <input type="hidden" name="on" value={r.show_on_site ? "0" : "1"} />
                          <ConfirmButton className={`onpage-toggle${r.show_on_site ? " is-on" : ""}`} tone={r.show_on_site ? "alert" : "gold"}
                            yes={r.show_on_site ? "Yes, take them off" : "Yes, show them"}
                            title={r.show_on_site ? `Take ${r.name} off the event page?` : `Show ${r.name} on the event page?`}
                            items={r.show_on_site
                              ? ["They're taken off Speakers and special guests on the public event page", "Their reply and RSVP stay as they are", "Nothing is emailed"]
                              : [`They show under Speakers and special guests${(r.public_role || roleForSpecification(r.specification)) ? ` as ${r.public_role || roleForSpecification(r.specification)}` : " as Special guest"}`, ...(r.reply === "yes" ? [] : ["Only once their reply is Coming"]), "Only their name, guest specification, role, short intro, page photo and link: never their email, phone or notes", "Change their role, intro and photo in Edit details", "Nothing is emailed"]}>
                            <span className="onpage-track" aria-hidden="true" />
                            <span>Event page<span className="sr-only">: {r.show_on_site ? "on" : "off"}</span></span>
                          </ConfirmButton>
                          {r.show_on_site && <span className="small muted">{r.reply === "yes" ? `Shown as ${r.public_role || "Special guest"}` : r.reply === "no" ? "Not shown: can't make it" : "Shows once they're Coming"}</span>}
                        </form>
                      ) : r.show_on_site && <><br /><span className="small muted">{r.reply === "yes" ? `On the event page${r.public_role ? ` · ${r.public_role}` : ""}` : r.reply === "no" ? "Event page: not shown, can't make it" : "Event page: shows once they're Coming"}</span></>}</td>
                  </tr>
                );
              })}
              {guests.length === 0 && <tr><td colSpan={canSend ? 5 : 4} className="muted">No guests on this event yet.{canEdit && " Use + Add a guest at the top."}</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
