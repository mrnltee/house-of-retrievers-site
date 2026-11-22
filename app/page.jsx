import HomePage from "./components/HomePage";
import { loadJourneySettings } from "./lib/journeySettingsStore";
import { loadJourney } from "./lib/journeyStore";
import { loadEvents } from "./lib/publicEvents";
import { hasEnded } from "./lib/eventTime.mjs";

// Saving in admin → Journey timeline refreshes this at once (revalidatePath("/")); this is the fallback.
export const revalidate = 300;

/** Reads the journey timeline settings and stops on the server, so the page never flashes the old layout. */
export default async function Home() {
  const [journeySettings, journeyStops, events] = await Promise.all([loadJourneySettings(), loadJourney(), loadEvents().catch(() => [])]);
  // The Coming up card under the hero: the soonest event that hasn't ended.
  const now = Date.now();
  const upcoming = events
    .filter((event) => !hasEnded(event, now) && event.status !== "cancelled")
    .sort((a, b) => a.date.localeCompare(b.date) || (a.startTime || "").localeCompare(b.startTime || ""));
  return <HomePage journeySettings={journeySettings} journeyStops={journeyStops} nextEvent={upcoming[0] || null} moreEvents={Math.max(0, upcoming.length - 1)} />;
}
