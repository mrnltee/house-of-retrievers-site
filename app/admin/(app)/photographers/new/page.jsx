import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import PhotographerForm from "../PhotographerForm";
import Icon from "../../../../components/Icon";

export default async function NewPhotographerPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("photographers:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/photographers`}><Icon name="arrowLeft" /> Photographers</a></p>
      <PageHead title="Add photographer" lead="Their name, photo, a short bio, and where people can see more of their work." />
      <Flash params={params} />
      <PhotographerForm />
    </>
  );
}
