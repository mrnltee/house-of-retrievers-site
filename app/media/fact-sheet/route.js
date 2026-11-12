/**
 * The organization fact sheet as a one-file PDF: the same rows and boilerplates
 * as the media hub's Press kit section, so an edit in Admin → Media hub reaches both.
 * Helvetica only (see letterPdf.mjs), so nothing needs embedding.
 */
import PDFDocument from "pdfkit";
import { LETTER_LOGO_PNG } from "../../lib/letters/logo.mjs";
import { pdfSafe } from "../../lib/letterPdf.mjs";
import { loadPublishedMediaContent } from "../../lib/mediaHubStore";
import { pressKitFrom } from "../../lib/mediaPressKit.mjs";

export const dynamic = "force-dynamic";

const INK = "#0D0D0D";
const GOLD = "#7A5A1C";
const MUTED = "#5C5C5C";
const RULE = "#D9BE86";
const MARGIN = 56;
const LABEL_WIDTH = 132;

function buildPdf(kit) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, info: { Title: "Organization fact sheet | The House of Retrievers Society Inc.", Author: "The House of Retrievers Society Inc." } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const width = doc.page.width - MARGIN * 2;
    const bottom = () => doc.page.height - MARGIN - 30;
    const room = (height) => { if (doc.y + height > bottom()) doc.addPage(); };

    doc.image(Buffer.from(LETTER_LOGO_PNG, "base64"), MARGIN, MARGIN, { fit: [190, 78] });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("MEDIA HUB", MARGIN, MARGIN + 6, { width, align: "right", characterSpacing: 1.4 });
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text("media.houseofretrieversph.org", MARGIN, MARGIN + 19, { width, align: "right" });
    doc.y = MARGIN + 100;
    doc.font("Helvetica-Bold").fontSize(22).fillColor(INK).text("Organization fact sheet", MARGIN, doc.y);
    doc.moveDown(0.25);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text("The House of Retrievers Society Inc. · Paws for a Purpose", { width });
    doc.moveDown(1.1);

    const rows = [...kit.factSheet, ["Mission", kit.mission], ["Media contact", "houseofretrieversph@gmail.com"]];
    for (const [label, detail] of rows) {
      const text = pdfSafe(detail);
      doc.font("Helvetica").fontSize(10);
      const height = Math.max(doc.heightOfString(text, { width: width - LABEL_WIDTH, lineGap: 2 }), 12) + 15;
      room(height);
      const y = doc.y;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).lineWidth(0.6).strokeColor(RULE).stroke();
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(GOLD).text(pdfSafe(label).toUpperCase(), MARGIN, y + 9, { width: LABEL_WIDTH - 12, characterSpacing: 0.9 });
      doc.font("Helvetica").fontSize(10).fillColor(INK).text(text, MARGIN + LABEL_WIDTH, y + 7, { width: width - LABEL_WIDTH, lineGap: 2 });
      doc.y = y + height;
    }

    const section = (title, body) => {
      const paragraphs = pdfSafe(body).split("\n\n");
      doc.font("Helvetica").fontSize(10);
      room(46 + doc.heightOfString(paragraphs[0], { width, lineGap: 2.5 }));
      doc.moveDown(1.4);
      doc.font("Helvetica-Bold").fontSize(7.5).fillColor(GOLD).text(title.toUpperCase(), MARGIN, doc.y, { width, characterSpacing: 0.9 });
      doc.moveDown(0.6);
      for (const paragraph of paragraphs) {
        doc.font("Helvetica").fontSize(10).fillColor(INK).text(paragraph, MARGIN, doc.y, { width, lineGap: 2.5 });
        doc.moveDown(0.6);
      }
    };
    const draft = kit.boilerplatesApproved ? "" : " (draft for approval)";
    section(`About House of Retrievers: short${draft}`, kit.boilerplateShort);
    section(`About House of Retrievers: long${draft}`, kit.boilerplateLong);
    doc.end();
  });
}

export async function GET() {
  const kit = pressKitFrom(await loadPublishedMediaContent());
  const pdf = await buildPdf(kit);
  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="house-of-retrievers-fact-sheet.pdf"',
      "Cache-Control": "no-store",
    },
  });
}
