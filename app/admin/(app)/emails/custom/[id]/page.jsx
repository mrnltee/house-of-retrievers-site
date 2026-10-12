import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { CUSTOM_KINDS, TEMPLATE_VARIABLES } from "../../../../../lib/emailTemplates.mjs";
import { loadCustomTemplate } from "../../../../../lib/emailSettings";
import { Flash, NotAllowed, PageHead } from "../../../ui";
import TemplateEditor from "../../[key]/TemplateEditor";

/** One of HOR's own templates. */
export default async function CustomEmailTemplatePage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("people:edit");
  if (!allowed) return <NotAllowed />;
  const row = await loadCustomTemplate(id);
  if (!row) notFound();
  const k = CUSTOM_KINDS[row.kind];
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/emails`}>← Email templates</a></p>
      <PageHead title={row.name} lead={`${k.title} template. ${k.when}`} />
      <Flash params={query} />
      <TemplateEditor
        customId={row.id}
        kind={row.kind}
        name={row.name}
        initial={row}
        defaults={k.defaults}
        custom
        variables={k.variables.map((name) => [name, TEMPLATE_VARIABLES[name]])}
      />
    </>
  );
}
