import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { Flash, NotAllowed, PageHead } from "../../ui";
import BeneficiaryForm from "../BeneficiaryForm";

export default async function NewBeneficiaryPage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("beneficiaries:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/beneficiaries`}>← Beneficiaries</a></p>
      <PageHead title="Add beneficiary" lead="Start with the name; the rest can wait. The contact, address and greeting are used in letters." />
      <Flash params={params} />
      <BeneficiaryForm />
    </>
  );
}
