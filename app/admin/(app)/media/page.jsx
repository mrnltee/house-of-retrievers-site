import { pageAdmin } from "../../../lib/admin/guard";
import HowTo from "../HowTo";
import { PAGE_GUIDES } from "../../../lib/admin/howToGuides.mjs";
import { sql } from "../../../lib/db";
import { PageHead, Flash, NotAllowed } from "../ui";
import MediaEditor from "./MediaEditor";
import { DEFAULT_MEDIA_PROFILE, DEFAULT_MEDIA_TIMELINE } from "../../../lib/mediaHub.mjs";
import { DEFAULT_COMMUNITY, DEFAULT_PACK, staleCounts } from "../../../lib/mediaReach.mjs";
import { loadInstagramCounts } from "../../../lib/instagramCounts";
import { DEFAULT_BOILERPLATE_LONG, DEFAULT_BOILERPLATE_SHORT, DEFAULT_FACT_SHEET, DEFAULT_STORY_ANGLES, factSheetText } from "../../../lib/mediaPressKit.mjs";

export const dynamic = "force-dynamic";

const DEFAULTS = {
  heroTitle: "A house with<br><em>a purpose.</em>",
  heroLead: "The media hub for The House of Retrievers’ Society, Inc.—a Philippine nonprofit rooted in the bond between dogs and the people who care for them.",
  about: "We’re furparents who raise our retrievers well—and bring them along to do some good. One paw, one person, and one community at a time.\n\nThe House of Retrievers’ Society, Inc., formerly known as House of Retrievers PH, is a Philippine SEC-registered nonprofit organization built around the relationship between dogs and the people who love them.",
  mission: "To bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.",
  stories: "17 May 2026 · Parklinks Pet Park, Pasig · Beneficiary: MBY Pet Rescue and Sanctuary\n\nVisit to Milagros Elderly Shelter · August 2026 · Milagros Elderly Home Care and Services\n\nPack walk with Beagle Buddies PH · 23 August 2026 · Ayala Triangle, Makati",
  partnerships: "Event partnerships, Purpose program partnerships, advocacy campaigns, product and in-kind support, educational sessions, venue collaborations, content partnerships, and CSR volunteering.",
  factSheet: factSheetText(DEFAULT_FACT_SHEET),
  boilerplateShort: DEFAULT_BOILERPLATE_SHORT,
  boilerplateLong: DEFAULT_BOILERPLATE_LONG,
  boilerplatesApproved: false,
  storyAngles: DEFAULT_STORY_ANGLES,
  community: DEFAULT_COMMUNITY,
  pack: DEFAULT_PACK,
  timelineOrientation: "vertical",
  timeline: DEFAULT_MEDIA_TIMELINE,
  profile: DEFAULT_MEDIA_PROFILE,
  contactEmail: "houseofretrieversph@gmail.com",
  seoTitle: "Media hub | The House of Retrievers’ Society, Inc.",
  seoDescription: "Press resources, organization information, partnership context, and media contact details for The House of Retrievers’ Society, Inc.",
};

export default async function MediaAdminPage({ searchParams }) {
  const { allowed } = await pageAdmin("media:view");
  if (!allowed) return <NotAllowed />;
  const params = await searchParams;
  const [document] = await sql("SELECT content, status, updated_at, updated_by FROM media_hub_documents WHERE id=true");
  const content = { ...DEFAULTS, ...(document?.content || {}) };
  const instagram = await loadInstagramCounts();
  const stale = staleCounts(document?.content || {}, { instagram });
  return (
    <>
      <PageHead title="Media hub" lead="The wording, photos and numbers on the public media hub, in the order they appear there. Save draft keeps changes private; Publish puts them live." ><HowTo guide={PAGE_GUIDES.media[0]} guides={PAGE_GUIDES.media} className="btn ghost" /></PageHead>
      <Flash params={params} />
      <MediaEditor content={content} stale={stale} liveInstagram={Boolean(instagram)} status={document?.status || "draft"} updatedAt={document?.updated_at} updatedBy={document?.updated_by} />
    </>
  );
}
