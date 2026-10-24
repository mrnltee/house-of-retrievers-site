import HomePage from "./components/HomePage";
import { loadJourneySettings } from "./lib/journeySettingsStore";

// Saving in admin → Journey timeline refreshes this at once (revalidatePath("/")); this is the fallback.
export const revalidate = 300;

/** Reads the admin-set journey timeline settings on the server, so the page never flashes the old layout. */
export default async function Home() {
  return <HomePage journeySettings={await loadJourneySettings()} />;
}
