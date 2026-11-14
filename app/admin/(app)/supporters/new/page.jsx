import { pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import SupporterForm from "../SupporterForm";
import { eventsForBrand } from "../../../../lib/eventBrandsStore";
import { KINDS, brandNameFrom } from "../../../../lib/supporters.mjs";

export default async function NewSupporterPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("supporters:edit");
  if (!allowed) return <NotAllowed />;
  // Arriving from a search with no results: the name typed, the type filter, and the event searched from.
  const events = await eventsForBrand();
  const fromEvent = events.find((e) => e.id === params?.event) || null;
  const prefill = { name: brandNameFrom(params?.name), kind: KINDS.includes(params?.kind) ? params.kind : "", event: fromEvent };
  return (
    <>
      <PageHead title="Add sponsor or partner" lead={prefill.event ? `Start with the name and type; it goes on ${prefill.event.title}'s Brand tracker when you create it.` : "Start with the name and type; the rest can wait until they're confirmed."} />
      <Flash params={params} />
      <SupporterForm row={null} events={events} prefill={prefill} />
    </>
  );
}
