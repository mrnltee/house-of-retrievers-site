import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import BeneficiaryForm from "../BeneficiaryForm";
import Icon from "../../../../components/Icon";

export default async function NewBeneficiaryPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("beneficiaries:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/beneficiaries`}><Icon name="arrowLeft" /> Beneficiaries</a></p>
      <PageHead title="Add beneficiary" lead="Start with the name; the rest can wait. The contact, address and greeting are used in letters." />
      <Flash params={params} />
      <BeneficiaryForm startName={String(params?.name || "").replace(/\s+/g, " ").trim().slice(0, 120)} />
    </>
  );
}
