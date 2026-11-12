/**
 * The media hub's press kit text: fact sheet rows and the two boilerplates.
 * Shared by the public page, the PDF and Admin → Media hub. Pure, so it is tested.
 */
export const DEFAULT_MISSION = "To bring responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.";

/** @type {[string, string][]} */
export const DEFAULT_FACT_SHEET = [
  ["Legal name", "The House of Retrievers’ Society, Inc."],
  ["Also known as", "House of Retrievers, HoR. Formerly House of Retrievers PH."],
  ["What it is", "A Philippine nonprofit, registered with the SEC in September 2026."],
  ["SEC registration", "No. 2026090268846-04"],
  ["Advocacy platform", "Paws for a Purpose"],
  ["Purpose areas", "Celebrate · Learn · Give Back · Care · Connect"],
  ["Who can join", "Pet parents of every breed, and volunteers with or without a dog."],
  ["First fundraiser", "Pawres de Mayo, 17 May 2026, for MBY Pet Rescue and Sanctuary."],
  ["Official launch", "Golden Beginning: Paws and Purpose, 30 November 2026, Novotel Manila Araneta City, Quezon City."],
  ["Online", "houseofretrieversph.org · Facebook and Instagram @houseofretrieversph"],
];

export const DEFAULT_BOILERPLATE_SHORT = "The House of Retrievers’ Society, Inc. is an SEC-registered nonprofit in the Philippines that brings responsible pet parents and their dogs together to do good. Through five purpose areas (Celebrate, Learn, Give Back, Care, and Connect), HoR supports rescues and communities, naming every beneficiary up front. Paws for a Purpose.";

export const DEFAULT_BOILERPLATE_LONG = "The House of Retrievers’ Society, Inc. (HoR) began when retriever families met through a group chat to plan a doggie run. That gathering became Pawres de Mayo in May 2026, a celebration that supported MBY Pet Rescue and Sanctuary and published a breakdown of what was turned over. By September 2026, HoR was registered with the SEC as a nonprofit.\n\nToday HoR welcomes pet parents of every breed and volunteers with or without dogs. Its work runs through five purpose areas: Celebrate, Learn, Give Back, Care, and Connect. Activities have included free hugs events in BGC, a creative workshop with Pawfect Blooms, a visit to elderly residents at Milagros Elderly Home Care and Services, and a pack walk with Beagle Buddies PH. Every activity names its beneficiary before it starts. HoR’s promise: Raise responsibly. Serve generously. HoR launches publicly on 30 November 2026 at Novotel Manila Araneta City.";

export const FACT_SHEET_MAX_ROWS = 14;

/** Fact sheet rows from the editor's text: one "Label: detail" per line. Lines without a colon are dropped. */
export function parseFactSheet(value) {
  return String(value || "").split(/\r?\n/).map((line) => {
    const at = line.indexOf(":");
    if (at < 1) return null;
    const label = line.slice(0, at).trim().slice(0, 60);
    const detail = line.slice(at + 1).trim().slice(0, 300);
    return label && detail ? [label, detail] : null;
  }).filter(Boolean).slice(0, FACT_SHEET_MAX_ROWS);
}

/** The editor's text for a set of rows. */
export function factSheetText(rows) {
  return rows.map(([label, detail]) => `${label}: ${detail}`).join("\n");
}

/** Plain text: tags and the few entities the hub's rich text uses are removed. */
export function plainText(value) {
  return String(value || "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&").replace(/&apos;|&#39;/g, "’").replace(/&quot;/g, "\"").replace(/&nbsp;/g, " ")
    .replace(/[<>]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** The press kit shown publicly: saved wording where there is any, the built-in wording otherwise. */
export function pressKitFrom(content = {}) {
  const rows = parseFactSheet(content?.factSheet);
  return {
    factSheet: rows.length ? rows : DEFAULT_FACT_SHEET,
    boilerplateShort: plainText(content?.boilerplateShort) || DEFAULT_BOILERPLATE_SHORT,
    boilerplateLong: String(content?.boilerplateLong || "").split(/\n{2,}/).map(plainText).filter(Boolean).join("\n\n") || DEFAULT_BOILERPLATE_LONG,
    boilerplatesApproved: content?.boilerplatesApproved === true,
    mission: plainText(content?.mission) || DEFAULT_MISSION,
  };
}
