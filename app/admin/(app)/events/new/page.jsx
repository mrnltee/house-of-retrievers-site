import { pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import EventForm from "../EventForm";

export default async function NewEventPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("events:edit");
  if (!allowed) return <NotAllowed />;
  return (
    <>
      <PageHead title="Create event" lead="Save a draft any time. Publish when every fact is confirmed by HOR." />
      <Flash params={params} />
      <EventForm event={null} autoDescribe={Boolean(process.env.GEMINI_API_KEY)} />
    </>
  );
}
