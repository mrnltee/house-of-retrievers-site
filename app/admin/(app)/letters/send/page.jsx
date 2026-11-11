import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { MAX_LETTER_RECIPIENTS } from "../../../../lib/letters.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import LetterSend from "./LetterSend";
import { SendIntro } from "./SendIntro";
import { loadSendData } from "./sendData";

export const maxDuration = 120;

/**
 * Send a letter, as a full page. Most sends open the same thing in a window
 * over the page they started from (SendLetterModal); this page is what a
 * direct link, a new tab or an error after sending shows.
 */
export default async function SendLetterPage({ searchParams }) {
  const params = await searchParams;
  const { admin, allowed } = await pageAdmin("letters:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const data = await loadSendData(params, { admin, base });
  return (
    <>
      <p className="small">Back to <a href={`${base}/guests`}>Guest list</a> · <a href={`${base}/beneficiaries`}>Beneficiaries</a> · <a href={`${base}/supporters?view=list`}>Brands & Partners</a> · <a href={`${base}/letters`}>Letters</a></p>
      <PageHead title="Send a letter" lead={`The letter is filled in with each recipient's name and sent as a PDF attached to a short email, or written in the email itself. Up to ${MAX_LETTER_RECIPIENTS} at a time.`} />
      <Flash params={params} />
      <SendIntro data={data} base={base} />
      {data.props.recipients.length === 0 ? (
        <p className="card muted">No recipients picked. In the <a href={`${base}/guests`}>Guest list</a>, <a href={`${base}/beneficiaries`}>Beneficiaries</a> or <a href={`${base}/supporters?view=list`}>Brands & Partners</a>, tick people and press Send, or open someone in People and choose “Send a letter”.</p>
      ) : <LetterSend {...data.props} />}
    </>
  );
}
