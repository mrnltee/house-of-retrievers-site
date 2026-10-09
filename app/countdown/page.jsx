import CountdownView from "./CountdownView";
import { quoteAt } from "./quotes.mjs";
import { LAUNCH_AT } from "../lib/countdownHost.mjs";
import { SITE_NAME } from "../lib/siteSeo.mjs";
import "./countdown.css";

// Rendered per request: the quote and the server's clock must be current.
export const dynamic = "force-dynamic";

export const metadata = {
  title: `Almost time | ${SITE_NAME}`,
  description: "House of Retrievers PH opens on Saturday, 10 October 2026 at 5:00 PM (Manila).",
  robots: { index: false, follow: false },
  alternates: { canonical: null },
};

export default function CountdownPage() {
  const now = Date.now();
  const { index, changesAt } = quoteAt(now);
  return <CountdownView launchAt={LAUNCH_AT} serverNow={now} initialQuote={index} initialChangesAt={changesAt} />;
}
