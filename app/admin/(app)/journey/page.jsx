import { pageAdmin } from "../../../lib/admin/guard";
import { sql, hasDatabase } from "../../../lib/db";
import { PageHead, Flash, NotAllowed } from "../ui";
import JourneySettingsForm from "./JourneySettingsForm";
import { DEFAULT_JOURNEY_SETTINGS, cleanJourneyOrientation, cleanJourneyShow } from "../../../lib/journeySettings.mjs";

export const dynamic = "force-dynamic";

export default async function JourneyAdminPage({ searchParams }) {
  const { admin, allowed } = await pageAdmin("media:edit");
  if (!allowed) return <NotAllowed />;
  const [row] = hasDatabase() ? await sql("SELECT show, orientation, updated_at, updated_by FROM journey_settings WHERE id=true") : [];
  const settings = row
    ? { show: cleanJourneyShow(row.show), orientation: cleanJourneyOrientation(row.orientation) }
    : DEFAULT_JOURNEY_SETTINGS;
  return (
    <>
      <PageHead title="Journey timeline" lead="Control whether the homepage “Our journey” timeline shows, and which layout it uses." />
      <Flash params={searchParams} />
      <JourneySettingsForm settings={settings} updatedAt={row?.updated_at} updatedBy={row?.updated_by} />
    </>
  );
}
