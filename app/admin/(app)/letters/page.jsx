import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { blanksOf } from "../../../lib/letters.mjs";
import { listLetters } from "../../../lib/letterStore";
import { Flash, NotAllowed, PageHead, formatWhen } from "../ui";

/** Settings → Letters: HOR's prepared letters, sent as a PDF with a covering email. */
export default async function LettersPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const letters = await listLetters();
  return (
    <>
      <PageHead title="Letters" lead="HOR's sponsorship, donation, X-Deal and invitation letters. Each is sent as a PDF attached to a short email, addressed to the company by name. Send them from Sponsors & partners (tick the records) or from a person's profile in People." />
      <Flash params={params} />
      <ul className="card-list">
        {letters.map((l) => {
          const asks = blanksOf(l.subject, l.cover, l.body).length;
          return (
            <li key={l.key} className="card letter-card">
              <div>
                <h2 style={{ margin: "0 0 4px" }}><a href={`${base}/letters/${l.key}`}>{l.name}</a></h2>
                <p className="small muted" style={{ margin: 0 }}>Subject: {l.subject}</p>
                <p className="small muted" style={{ margin: "4px 0 0" }}>
                  {asks ? `${asks} blank${asks === 1 ? "" : "s"} to fill when sending` : "Nothing to fill in when sending"} ·{" "}
                  {l.custom ? `Your wording, saved ${formatWhen(l.updatedAt)} by ${l.updatedBy}` : "Original wording from HOR's Word file"}
                </p>
              </div>
              <div className="actions">
                <a className="btn ghost" href={`${base}/letters/${l.key}`}>Edit</a>
                <form method="post" action={`${base}/letters/pdf`} target="_blank">
                  <input type="hidden" name="letter" value={l.key} />
                  <input type="hidden" name="sample" value="1" />
                  <button type="submit" className="btn ghost" data-confirm="not-needed-read-only">Preview PDF</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="banner note small">
        In a letter, <strong>[Company Name]</strong> becomes the sponsor or partner's name (for People: their organization, else their name) and <strong>[Date]</strong> the day it's sent. Any other word in [square brackets] is asked for when you send; [Something?] with a question mark is optional, and its line is left out when empty. What you type is remembered for next time.
      </div>
    </>
  );
}
