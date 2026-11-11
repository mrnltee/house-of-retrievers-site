import * as fontkit from "fontkit";
import sharp from "sharp";
import PDFDocument from "pdfkit";
import { hasDatabase, sql } from "./db.js";
import { CARD_GOLD, CARD_HEIGHT, CARD_WHITE, CARD_WIDTH, MAX_INVITATION_PAGES, cardLayout, cleanInvitation } from "./invitationCard.mjs";
import { SANS_WOFF, SCRIPT_WOFF } from "./invitations/fonts.mjs";

/**
 * Invitation cards (owner, 2026-11-11): the guest's name drawn onto HOR's card
 * art, and the PDF of the card plus its extra pages. Text is turned into SVG
 * outlines with fontkit (librsvg can't load our fonts), then laid on the card
 * with sharp, so the picture in the email and the PDF look the same everywhere.
 */
let fonts = null;
const loadFonts = () => (fonts ??= { script: fontkit.create(Buffer.from(SCRIPT_WOFF, "base64")), sans: fontkit.create(Buffer.from(SANS_WOFF, "base64")) });

const MAX_TEXT_WIDTH = CARD_WIDTH - 120;
const escAttr = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

/** One line of text as an SVG <path>, centred on the card at `baseline`; shrinks to fit the width. */
function textPath(font, text, { size, baseline, fill, tracking = 0 }) {
  if (!text) return "";
  const run = font.layout(text);
  const unit = size / font.unitsPerEm;
  const track = tracking * font.unitsPerEm;
  const width = run.positions.reduce((sum, p) => sum + p.xAdvance + track, 0) - track;
  const scale = Math.min(unit, MAX_TEXT_WIDTH / Math.max(1, width));
  let x = 0;
  const parts = run.glyphs.map((glyph, i) => {
    const pos = run.positions[i];
    const d = glyph.path.toSVG();
    const at = x + pos.xOffset;
    x += pos.xAdvance + track;
    return d ? `<path transform="translate(${at.toFixed(1)} ${pos.yOffset.toFixed(1)})" d="${d}"/>` : "";
  }).join("");
  const left = (CARD_WIDTH - width * scale) / 2;
  return `<g fill="${fill}" transform="translate(${left.toFixed(1)} ${baseline}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})">${parts}</g>`;
}

/** The overlay (SVG) with the guest's name and organization, for a 1080 × 1350 card. */
export function cardOverlaySvg(settings, { name, org }) {
  const { script, sans } = loadFonts();
  const at = cardLayout(settings, { org });
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}"><title>${escAttr(name)}</title>`
    + textPath(script, name, { size: at.nameSize, baseline: at.nameBaseline, fill: CARD_GOLD })
    + (org ? textPath(sans, org, { size: at.orgSize, baseline: at.orgBaseline, fill: CARD_WHITE, tracking: 0.02 }) : "")
    + "</svg>";
}

/** A stored or uploaded picture → its bytes, or null. `src` is /api/event-image/<id> or a data URL. */
async function imageBytes(src) {
  const data = String(src || "").match(/^data:image\/(?:png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (data) return Buffer.from(data[1], "base64");
  const id = String(src || "").match(/^\/api\/event-image\/([0-9a-f-]{36})$/)?.[1];
  if (!id || !hasDatabase()) return null;
  const [row] = await sql("SELECT data FROM event_images WHERE id = $1", [id]);
  return row ? Buffer.from(row.data) : null;
}

/** A picture fitted to 1080 × 1350 (cover, centred). */
// limitInputPixels: no picture larger than 4096 × 4096 is decoded.
const fitted = (bytes) => sharp(bytes, { limitInputPixels: 4096 * 4096 }).resize(CARD_WIDTH, CARD_HEIGHT, { fit: "cover", position: "centre" });

/**
 * One guest's card as a JPEG. `settings` may carry unsaved uploads in
 * `cardUpload` (a data URL) from the editor's preview. Throws when the card art is missing.
 */
export async function renderCard(settings, names, { cardUpload = "" } = {}) {
  const bytes = await imageBytes(cardUpload || cleanInvitation(settings).card);
  if (!bytes) throw new Error("The invitation card picture couldn't be found. Upload it again in the letter.");
  return fitted(bytes).composite([{ input: Buffer.from(cardOverlaySvg(settings, names)) }]).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}

/** The extra pages (Attire, Beneficiaries…) as JPEGs, in order; missing ones are skipped. */
export async function extraPages(settings, uploads = []) {
  const s = cleanInvitation(settings);
  const out = [];
  for (const src of [...s.pages, ...uploads].slice(0, MAX_INVITATION_PAGES)) {
    const bytes = await imageBytes(src);
    if (bytes) out.push(await fitted(bytes).jpeg({ quality: 86, mozjpeg: true }).toBuffer());
  }
  return out;
}

/** The invitation PDF: the guest's card, then the extra pages, each a full 4:5 page. */
export function invitationPdf(pages, { title = "Invitation" } = {}) {
  return new Promise((resolve, reject) => {
    const size = [540, 675];
    const doc = new PDFDocument({ size, margin: 0, autoFirstPage: false, info: { Title: title, Author: "The House of Retrievers’ Society, Inc." } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    for (const page of pages) {
      doc.addPage({ size, margin: 0 });
      doc.image(page, 0, 0, { width: size[0], height: size[1] });
    }
    doc.end();
  });
}

/** Everything one guest gets: { card (JPEG), pdf }. */
export async function invitationFor(settings, names, { title, cardUpload = "", pageUploads = [] } = {}) {
  const card = await renderCard(settings, names, { cardUpload });
  const pdf = await invitationPdf([card, ...(await extraPages(settings, pageUploads))], { title });
  return { card, pdf };
}
