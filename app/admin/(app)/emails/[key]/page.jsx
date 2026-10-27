import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../lib/admin/guard";
import { EDITABLE_TEMPLATES, TEMPLATE_VARIABLES } from "../../../../lib/emailTemplates.mjs";
import { loadTemplate } from "../../../../lib/emailSettings";
import { Flash, NotAllowed, PageHead } from "../../ui";
import TemplateEditor from "./TemplateEditor";

export default async function EmailTemplatePage({ params, searchParams }) {
  const { key } = await params;
  const query = await searchParams;
  const { allowed } = await pageAdmin("emails:edit");
  if (!allowed) return <NotAllowed />;
  const t = EDITABLE_TEMPLATES[key];
  if (!t) notFound();
  const base = await adminBase();
  const saved = await loadTemplate(key);
  return (
    <>
      <p className="small"><a href={`${base}/emails`}>← Email templates</a></p>
      <PageHead title={t.title} lead={t.when} />
      <Flash params={query} />
      <TemplateEditor
        templateKey={key}
        initial={saved || t.defaults}
        defaults={t.defaults}
        custom={Boolean(saved)}
        variables={t.variables.map((name) => [name, TEMPLATE_VARIABLES[name]])}
      />
    </>
  );
}
