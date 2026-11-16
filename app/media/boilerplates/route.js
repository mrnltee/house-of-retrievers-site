/**
 * Both press kit boilerplates as one plain-text download, from the same
 * published wording as the media hub and the fact sheet PDF.
 */
import { loadPublishedMediaContent } from "../../lib/mediaHubStore";
import { boilerplatesText, pressKitFrom } from "../../lib/mediaPressKit.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const kit = pressKitFrom(await loadPublishedMediaContent());
  return new Response(boilerplatesText(kit), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="house-of-retrievers-boilerplates.txt"',
      "Cache-Control": "no-store",
    },
  });
}
