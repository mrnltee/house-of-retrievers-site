import { sql } from "../../../../lib/db";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { categoryOf } from "../../../../lib/contacts.mjs";
import { removeContact, saveContact } from "../../../contactActions";
import ConfirmButton from "../../ConfirmButton";
import { Flash, NotAllowed, PageHead } from "../../ui";
import ContactFields from "../ContactFields";

const isUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || ""));

export default async function ContactPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("guests:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const [row] = isUuid(id) ? await sql("SELECT * FROM letter_contacts WHERE id=$1 AND deleted_at IS NULL", [id]) : [];
  if (!row) return <p className="card muted">That contact wasn't found. <a href={`${base}/guests`}>Back to the guest list</a></p>;
  const cat = categoryOf(row.category);
  return (
    <>
      <p className="small"><a href={`${base}/guests`}>← Guest list</a></p>
      <PageHead title={row.name} lead={cat ? `${cat.label}. Gets the letter set for this category.` : ""} />
      <Flash params={query} />
      <form action={saveContact} className="card form">
        <input type="hidden" name="id" value={row.id} />
        <ContactFields row={row} />
        <div className="actions">
          <ConfirmButton className="btn dark" title="Save changes?" items={["Updates this contact. Changing the category changes which letter they get."]}>Save</ConfirmButton>
          {cat && <a className="btn ghost" href={`${base}/letters/send?letter=${cat.letter}&to=contact:${row.id}`}>✉ Send their letter</a>}
        </div>
      </form>
      <form action={removeContact} className="actions" style={{ marginTop: 12 }}>
        <input type="hidden" name="id" value={row.id} />
        <ConfirmButton className="btn ghost" title={`Remove ${row.name}?`} items={["They leave the guest list. Letters already sent stay sent."]} yes="Yes, remove">Remove from the guest list</ConfirmButton>
      </form>
    </>
  );
}
