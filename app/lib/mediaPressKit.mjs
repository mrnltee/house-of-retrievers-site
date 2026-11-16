/**
 * The media hub's press kit text: fact sheet rows and the two boilerplates.
 * Shared by the public page, the PDF and Admin → Media hub. Pure, so it is tested.
 */
import { MEDIA_THUMBNAILS } from "./mediaHub.mjs";
import { communityLine, reachFrom } from "./mediaReach.mjs";
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
  ["First fundraiser", "Pawres de Mayo, 17 May 2026, at Parklinks Pet Park, Pasig, for MBY Pet Rescue and Sanctuary."],
  ["Official launch", "A Golden Beginning: Paws & Purpose, 30 November 2026, 3:00 PM, Novotel Manila Araneta City, Quezon City."],
  ["Online", "houseofretrieversph.org · Facebook and Instagram @houseofretrieversph"],
];

export const DEFAULT_BOILERPLATE_SHORT = "The House of Retrievers’ Society, Inc. is an SEC-registered nonprofit in the Philippines that brings responsible pet parents and their dogs together to do good. Through five purpose areas (Celebrate, Learn, Give Back, Care, and Connect), HoR supports rescues and communities, naming every beneficiary up front. Paws for a Purpose.";

export const DEFAULT_BOILERPLATE_LONG = "The House of Retrievers’ Society, Inc. (HoR) began when retriever families met through a group chat to plan a doggie run. That gathering became Pawres de Mayo in May 2026, a celebration that supported MBY Pet Rescue and Sanctuary and published a breakdown of what was turned over. By September 2026, HoR was registered with the SEC as a nonprofit.\n\nToday HoR welcomes pet parents of every breed and volunteers with or without dogs. Its work runs through five purpose areas: Celebrate, Learn, Give Back, Care, and Connect. Activities have included free hugs events in BGC, a creative workshop with Pawfect Blooms, a visit to elderly residents at Milagros Elderly Home Care and Services, and a pack walk with Beagle Buddies PH. Every activity names its beneficiary before it starts. HoR’s promise: Raise responsibly. Serve generously. HoR launches publicly on 30 November 2026 at Novotel Manila Araneta City.";

export const FACT_SHEET_MAX_ROWS = 14;

/**
 * Story angles: each one is a real stop on the home page's "Our journey" timeline (app/content/journey.js).
 * The bento on /media sizes tiles by position (globals.css "Press kit bento"): six fit it best, and
 * tiles 1, 2 and 5 show their photo largest.
 * @type {{title: string, meta: string, body: string, photo: string}[]}
 */
export const DEFAULT_STORY_ANGLES = [
  { title: "From a doggie run to a registered society", meta: "17 May 2026 · Parklinks Pet Park, Pasig", body: "Retriever families met in a group chat to plan a doggie run. It became Pawres de Mayo, a first fundraiser for MBY Pet Rescue and Sanctuary, and by September 2026 the group was registered with the SEC.", photo: "/journey/pawres-de-mayo/4.jpg" },
  { title: "Free hugs, now every month", meta: "July 2026 onward · BGC, Taguig", body: "International Free Hugs Day put the furbabies front and centre and began Purpose to Care. FreeHugs now returns to BGC on the last Sunday of each month.", photo: "/journey/freehugs-bgc/5.jpg" },
  { title: "Learning, with the dogs in mind", meta: "August 2026 · Quezon City", body: "A basic embroidery class with partner Pawfect Blooms began Purpose to Learn: an afternoon of stitching together around one table.", photo: "" },
  { title: "Comfort, planned with care staff", meta: "August 2026 · Milagros Elderly Home Care and Services", body: "A week after the class, members and their retrievers visited the residents of Milagros. The visit was shaped around care and companionship, not therapy.", photo: "" },
  { title: "Two communities, one walk", meta: "23 August 2026 · Ayala Triangle, Makati", body: "A pack walk with Beagle Buddies PH, the society’s first collaboration with another dog community: dog groups working together instead of competing.", photo: "/journey/beagle-buddies-pack-walk/5.jpg" },
  { title: "A meet-up every few weeks", meta: "October to November 2026 · Alabang, Pasay, Pasig", body: "A Weekend Social Run, the Bedazzle Barkdate and the Retriever Romp keep the pack together ahead of the public launch, A Golden Beginning, on 30 November.", photo: "" },
];

export const STORY_ANGLES_MAX = 8;

/** Story angles from the editor (JSON or an array): titled rows only, plain text, photos only from the approved list. */
export function cleanStoryAngles(value) {
  let rows = value;
  if (typeof value === "string") {
    try { rows = JSON.parse(value); } catch { rows = []; }
  }
  if (!Array.isArray(rows)) return [];
  const approved = new Set(MEDIA_THUMBNAILS.map(({ path }) => path));
  return rows.map((row) => ({
    title: plainText(row?.title).slice(0, 90),
    meta: plainText(row?.meta).slice(0, 120),
    body: plainText(row?.body).slice(0, 400),
    photo: approved.has(row?.photo) ? row.photo : "",
  })).filter((row) => row.title && row.body).slice(0, STORY_ANGLES_MAX);
}

/** Alt text for an approved photo path. */
export function photoAlt(path) {
  return MEDIA_THUMBNAILS.find((image) => image.path === path)?.alt || "";
}

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
  const facts = rows.length ? rows : DEFAULT_FACT_SHEET;
  // The audience line follows Admin → Media hub's channel numbers, unless HoR wrote its own row.
  const audience = communityLine(reachFrom(content).community);
  return {
    factSheet: audience && !facts.some(([label]) => /^online audience$/i.test(label)) ? [...facts, ["Online audience", audience]] : facts,
    boilerplateShort: plainText(content?.boilerplateShort) || DEFAULT_BOILERPLATE_SHORT,
    boilerplateLong: String(content?.boilerplateLong || "").split(/\n{2,}/).map(plainText).filter(Boolean).join("\n\n") || DEFAULT_BOILERPLATE_LONG,
    boilerplatesApproved: content?.boilerplatesApproved === true,
    mission: plainText(content?.mission) || DEFAULT_MISSION,
    // An editor that never saved angles (older drafts) keeps the built-in ones.
    storyAngles: Array.isArray(content?.storyAngles) && cleanStoryAngles(content.storyAngles).length ? cleanStoryAngles(content.storyAngles) : DEFAULT_STORY_ANGLES,
  };
}

/** The boilerplates download (/media/boilerplates): both versions, labelled, with the contact. */
export function boilerplatesText(kit) {
  const draft = kit.boilerplatesApproved ? "" : "Draft for approval: please check with us before publishing.\n\n";
  return `The House of Retrievers’ Society, Inc. — boilerplates\n\n${draft}SHORT (about 50 words)\n\n${kit.boilerplateShort}\n\nLONG (about 150 words)\n\n${kit.boilerplateLong}\n\nMedia contact: houseofretrieversph@gmail.com\nhttps://media.houseofretrieversph.org/\n`;
}
