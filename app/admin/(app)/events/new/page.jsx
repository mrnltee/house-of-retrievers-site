import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import Icon from "../../../../components/Icon";
import HowTo from "../../HowTo";
import { PAGE_GUIDES } from "../../../../lib/admin/howToGuides.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import EventForm from "../EventForm";

export default async function NewEventPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("events:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <a className="btn small ghost page-back" href={`${base}/events`}><Icon name="arrowLeft" /> All events</a>
      <PageHead title="Create event" lead="Save a draft any time. Publish when every fact is confirmed by HOR." ><HowTo guide={PAGE_GUIDES.eventEditor[0]} guides={PAGE_GUIDES.eventEditor} className="btn ghost" /></PageHead>
      <Flash params={params} />
      <EventForm event={null} autoDescribe={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}
