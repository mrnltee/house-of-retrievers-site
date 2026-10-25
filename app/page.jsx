import HomePage from "./components/HomePage";
import { loadJourneySettings } from "./lib/journeySettingsStore";
import { loadJourney } from "./lib/journeyStore";

// Saving in admin → Journey timeline refreshes this at once (revalidatePath("/")); this is the fallback.
export const revalidate = 300;

/** Reads the journey timeline settings and stops on the server, so the page never flashes the old layout. */
export default async function Home() {
  const [journeySettings, journeyStops] = await Promise.all([loadJourneySettings(), loadJourney()]);
  return <HomePage journeySettings={journeySettings} journeyStops={journeyStops} />;
}
