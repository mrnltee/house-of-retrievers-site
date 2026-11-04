import { notFound } from "next/navigation";
import { adminBase, pageAdmin } from "../../../../../lib/admin/guard";
import { can } from "../../../../../lib/admin/roles.mjs";
import { kindLabel } from "../../../../../lib/emailDesign.mjs";
import { loadDesign, loadHouse } from "../../../../../lib/emailDesignStore";
import { emailReady } from "../../../../../lib/email";
import { sql } from "../../../../../lib/db";
import { Flash, NotAllowed, PageHead } from "../../../ui";
import DesignEditor from "./DesignEditor";

/** One email design in the block editor; "house" edits HOR's shared header and footer. */
export default async function DesignPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const { admin, allowed } = await pageAdmin("emails:view");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  const house = await loadHouse();
  const isHouse = id === "house";
  const design = isHouse ? null : await loadDesign(id);
  if (!isHouse && (!design || design.kind === "house")) notFound();
  const [event] = design?.event_id ? await sql("SELECT id, title FROM events WHERE id = $1", [design.event_id]) : [];
  const back = event ? { href: `${base}/events/${event.id}/letters`, label: `${event.title} letters` } : { href: `${base}/emails/designs`, label: "Brand email designs" };
  return (
    <>
      <p className="small"><a href={back.href}>← {back.label}</a></p>
      <PageHead title={isHouse ? "HOR header & footer" : design.name} lead={isHouse ? "Shared by every design that doesn't use its own header or footer. Changes show on all of them." : `${kindLabel(design.kind)}${event ? ` · for ${event.title}` : " · library"}. Fill-ins like [Salutation] and [Event Name] fill in per brand when sent.`} />
      <Flash params={query} />
      <DesignEditor
        key={isHouse ? JSON.stringify(house).length + String(query?.ok || "") : `${design.id}-${design.updated_at}`}
        id={isHouse ? "house" : design.id}
        isHouse={isHouse}
        initial={isHouse ? { ownHeader: true, ownFooter: true, header: house.header, footer: house.footer, body: { style: {}, blocks: [] } } : design.doc}
        name={design?.name || ""}
        subject={design?.subject || ""}
        house={house}
        canEdit={can(admin, "letters:edit")}
        ready={emailReady()}
        me={admin.email}
      />
    </>
  );
}
