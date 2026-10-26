import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { NotAllowed, PageHead } from "../../ui";
import SheetImport from "../../SheetImport";

/** Adds many sponsors and partners from an Excel or CSV sheet. */
export default async function ImportSupportersPage() {
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/supporters`}>← Sponsors & partners</a></p>
      <PageHead title="Import sponsors & partners" lead="Add many at once from Excel or a CSV. Names already here are skipped, imported records start hidden from the website, and no emails are sent." />
      <SheetImport target="supporters" backHref={`${base}/supporters`} />
    </>
  );
}
