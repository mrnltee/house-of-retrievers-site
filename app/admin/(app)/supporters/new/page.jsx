import { pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import SupporterForm from "../SupporterForm";

export default async function NewSupporterPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  return (
    <>
      <PageHead title="Add sponsor or partner" lead="Start with the name and type; the rest can wait until they're confirmed." />
      <Flash params={params} />
      <SupporterForm row={null} />
    </>
  );
}
