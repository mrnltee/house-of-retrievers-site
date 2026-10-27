import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { CUSTOM_KINDS, TEMPLATE_VARIABLES } from "../../../../lib/emailTemplates.mjs";
import { Flash, NotAllowed, PageHead } from "../../ui";
import TemplateEditor from "../[key]/TemplateEditor";

/** A new template of HOR's own: ?kind=acceptance or ?kind=event. */
export default async function NewEmailTemplatePage({ searchParams }) {
  const query = await searchParams;
  const { allowed } = await pageAdmin("emails:edit");
  if (!allowed) return <NotAllowed />;
  const kind = String(query?.kind || "");
  const k = CUSTOM_KINDS[kind];
  if (!k) notFound();
  const base = await adminBase();
  return (
    <>
      <p className="small"><a href={`${base}/emails`}>← Email templates</a></p>
      <PageHead title={`New ${k.title.toLowerCase()} template`} lead={k.when} />
      <Flash params={query} />
      <TemplateEditor
        kind={kind}
        initial={k.defaults}
        defaults={k.defaults}
        custom={false}
        variables={k.variables.map((name) => [name, TEMPLATE_VARIABLES[name]])}
      />
    </>
  );
}
