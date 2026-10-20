import { pageAdmin } from "../../../lib/admin/guard";
import { sql } from "../../../lib/db";
import { PageHead, Flash, NotAllowed } from "../ui";
import MediaEditor from "./MediaEditor";
import { DEFAULT_MEDIA_PROFILE, DEFAULT_MEDIA_TIMELINE } from "../../../lib/mediaHub.mjs";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  heroTitle: "A house with<br><em>a purpose.</em>",
  heroLead: "The media hub for The House of Retrievers Society Inc.—a Philippine nonprofit rooted in the bond between dogs and the people who care for them.",
  about: "We’re furparents who raise our retrievers well—and bring them along to do some good. One paw, one person, and one community at a time.\n\nThe House of Retrievers Society Inc., formerly known as House of Retrievers PH, is a Philippine SEC-registered nonprofit organization built around the relationship between dogs and the people who love them.",
  mission: "To bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.",
  stories: "Pawres de Mayo · 17 May 2026 · Parklinks Pet Park · Beneficiary: MBY Pet Rescue and Sanctuary\n\nPurpose to Care visit · Milagros Elderly Home Care and Services\n\nHoR × Beagle Buddies PH Community Pack Walk · 23 August 2026 · Ayala Triangle, Makati",
  partnerships: "Event partnerships, Purpose program partnerships, advocacy campaigns, product and in-kind support, educational sessions, venue collaborations, content partnerships, and CSR volunteering.",
  timelineOrientation: "vertical",
  timeline: DEFAULT_MEDIA_TIMELINE,
  profile: DEFAULT_MEDIA_PROFILE,
  contactEmail: "houseofretrieversph@gmail.com",
  seoTitle: "Media hub | The House of Retrievers Society Inc.",
  seoDescription: "Press resources, organization information, partnership context, and media contact details for The House of Retrievers Society Inc.",
};

export default async function MediaAdminPage({ searchParams }) {
  const { admin, allowed } = await pageAdmin("media:edit");
  if (!allowed) return <NotAllowed />;
  const [document] = await sql("SELECT content, status, updated_at, updated_by FROM media_hub_documents WHERE id=true");
  const content = { ...DEFAULTS, ...(document?.content || {}) };
  return (
    <>
      <PageHead title="Media hub" lead="Edit the public PR, press, and partnership resource hub. Draft changes stay private until you publish them." />
      <Flash params={searchParams} />
      <MediaEditor content={content} status={document?.status || "draft"} updatedAt={document?.updated_at} updatedBy={document?.updated_by} />
    </>
  );
}
