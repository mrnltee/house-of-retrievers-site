import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { listLetters, loadLetter, savedAnswers } from "../../../../lib/letterStore";
import { eventFills } from "../../../../lib/letterEventStore";
import { sql } from "../../../../lib/db";
import { LETTER_STARTERS } from "../../../../lib/letters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterEditor from "./LetterEditor";

/** One letter's wording: name, email subject, covering email and the letter itself. */
export default async function LetterPage({ params, searchParams }) {
  const { key } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("letters:view");
  if (!allowed) return <NotAllowed />;
  const letter = await loadLetter(key);
  if (!letter) notFound();
  const base = await adminBase();
  const original = LETTER_STARTERS.find((l) => l.key === key);
  const answers = await savedAnswers();
  const standard = Object.fromEntries([...answers.standard].map((label) => [label, answers.values[label]]));
  // An event's letter: its [Event …] blanks show the event's real details; Back goes to that event's letters.
  const [event] = letter.eventId ? await sql("SELECT id, title FROM events WHERE id = $1", [letter.eventId]) : [];
  const fills = event ? await eventFills(event.id) : null;
  // Previous / next in the same order as the list it came from (Letters, or this event's letters).
  const all = (await listLetters()).filter((l) => (event ? l.eventId === event.id : !l.eventId));
  const at = all.findIndex((l) => l.key === key);
  const prev = at > 0 ? all[at - 1] : null;
  const next = at >= 0 && at < all.length - 1 ? all[at + 1] : null;
  return (
    <>
      <PageHead title={letter.name} lead="Edit in four steps. The preview on the right shows it addressed to a sample company; blanks you type when sending stay highlighted.">
        <nav className="letter-nav" aria-label="Letters">
          {event ? <a className="btn small ghost" href={`${base}/events/${event.id}/letters`}>← {event.title}: letters</a> : <a className="btn small ghost" href={`${base}/letters`}>← Back to Letters</a>}
          {prev ? <a className="btn small" href={`${base}/letters/${prev.key}`} title={prev.name} rel="prev">‹ Previous</a> : <span className="btn small" aria-disabled="true">‹ Previous</span>}
          {next ? <a className="btn small" href={`${base}/letters/${next.key}`} title={next.name} rel="next">Next ›</a> : <span className="btn small" aria-disabled="true">Next ›</span>}
          {at >= 0 && <span className="small muted">{at + 1} of {all.length}</span>}
        </nav>
      </PageHead>
      <Flash params={query} />
      <LetterEditor letter={letter} original={original} pdfAction={`${base}/letters/pdf`} standard={standard} detailsHref={`${base}/letters/details`} eventFills={fills} eventTitle={event?.title || ""} />
    </>
  );
}
