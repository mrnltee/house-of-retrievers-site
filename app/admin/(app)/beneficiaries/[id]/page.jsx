import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { can } from "../../../../lib/admin/roles.mjs";
import { kindLabel, statusLabel } from "../../../../lib/beneficiaries.mjs";
import { letterFor } from "../../../../lib/contacts.mjs";
import { groupLetters } from "../../../../lib/letterStore";
import { removeBeneficiary } from "../../../beneficiaryActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead } from "../../ui";
import BeneficiaryForm from "../BeneficiaryForm";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

export default async function BeneficiaryPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("beneficiaries:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const [row] = isUuid(id) ? await sql("SELECT * FROM beneficiaries WHERE id=$1 AND deleted_at IS NULL", [id]) : [];
  if (!row) return <p className="card muted">That beneficiary wasn't found. <a href={`${base}/beneficiaries`}>Back to Beneficiaries</a></p>;
  const canEdit = can(admin, "beneficiaries:edit");
  return (
    <>
      <p className="small"><a href={`${base}/beneficiaries`}>← Beneficiaries</a></p>
      <PageHead title={row.name} lead={`${kindLabel(row.kind)} · ${statusLabel(row.status)}${row.location ? ` · ${row.location}` : ""}`}>
        {can(admin, "letters:edit") && <a className="btn ghost" href={`${base}/letters/send?letter=${letterFor("beneficiary", await groupLetters())}&to=beneficiary:${row.id}`}>✉ Send a letter</a>}
      </PageHead>
      <Flash params={query} />
      <BeneficiaryForm row={row} canEdit={canEdit} />
      {canEdit && (
        <form action={removeBeneficiary} className="actions" style={{ marginTop: 12 }}>
          <input type="hidden" name="id" value={row.id} />
          <ConfirmButton className="btn ghost" title={`Remove ${row.name}?`} items={["They leave Beneficiaries. Letters already sent stay sent."]} yes="Yes, remove">Remove</ConfirmButton>
        </form>
      )}
    </>
  );
}
