import PDFDocument from "pdfkit";
import { LETTER_LOGO_PNG } from "./letters/logo.mjs";
import { pdfSafe } from "./letterPdf.mjs";
import { LEGAL } from "./legal.mjs";

/**
 * The transparency report as an A4 PDF (owner, 22 Nov 2026): the same sections as /ledger/report, from
 * transparencyReport(). Helvetica only, like the fact sheet, so nothing needs embedding; ₱ prints as PHP.
 */
const INK = "#0D0D0D";
const GOLD = "#7A5A1C";
const MUTED = "#5C5C5C";
const RULE = "#D9BE86";
const MARGIN = 56;

const peso = (n) => `PHP ${Math.round(Number(n) || 0).toLocaleString("en-PH")}`;
const day = (d) => (d ? new Date(`${String(d).slice(0, 10)}T12:00:00+08:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }) : "");

export function ledgerReportPdf({ title, subtitle, report, rows = [] }) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true, info: { Title: `Transparency report: ${pdfSafe(title)}`, Author: LEGAL.org } });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    const width = doc.page.width - MARGIN * 2;
    const amountWidth = 110;
    const bottom = () => doc.page.height - MARGIN - 36;
    const room = (h) => { if (doc.y + h > bottom()) doc.addPage(); };
    const t = report.totals;

    doc.image(Buffer.from(LETTER_LOGO_PNG, "base64"), MARGIN, MARGIN, { fit: [170, 70] });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(GOLD).text("TRANSPARENCY REPORT", MARGIN, MARGIN + 6, { width, align: "right", characterSpacing: 1.4 });
    doc.y = MARGIN + 92;
    doc.font("Helvetica-Bold").fontSize(20).fillColor(INK).text(pdfSafe(title), MARGIN, doc.y, { width });
    doc.moveDown(0.2);
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(pdfSafe(subtitle), { width });
    doc.moveDown(1);

    const heading = (text) => {
      room(48);
      doc.moveDown(0.4);
      doc.font("Helvetica-Bold").fontSize(12).fillColor(INK).text(pdfSafe(text), MARGIN, doc.y, { width });
      const y = doc.y + 3;
      doc.moveTo(MARGIN, y).lineTo(MARGIN + width, y).lineWidth(0.8).strokeColor(RULE).stroke();
      doc.y = y + 6;
    };
    const row = (label, amount, { bold = false, indent = 0, muted = false, total = false } = {}) => {
      const text = pdfSafe(label);
      doc.font(bold || total ? "Helvetica-Bold" : "Helvetica").fontSize(9.5);
      const h = Math.max(doc.heightOfString(text, { width: width - amountWidth - indent - 10 }), 12);
      room(h + 6);
      if (total) doc.moveTo(MARGIN, doc.y - 2).lineTo(MARGIN + width, doc.y - 2).lineWidth(0.6).strokeColor(INK).stroke();
      const y = doc.y;
      doc.fillColor(muted ? MUTED : INK).text(text, MARGIN + indent, y, { width: width - amountWidth - indent - 10 });
      if (amount !== "") doc.text(amount == null ? "" : String(amount), MARGIN + width - amountWidth, y, { width: amountWidth, align: "right" });
      doc.y = y + h + 4;
    };
    const note = (text) => { room(24); doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(pdfSafe(text), MARGIN, doc.y, { width }); doc.moveDown(0.4); };

    heading("Summary");
    row("Cash raised", peso(t.cashIn));
    row("Less: expenses", `-${peso(t.spent)}`);
    row("Net proceeds", peso(t.net), { bold: true });
    row("Turned over to beneficiaries (cash)", `-${peso(t.turnedOver)}`);
    row("Held by HoR", peso(t.held), { total: true });
    note(`Also given to beneficiaries in goods: ${peso(t.goodsTurnedOver)}. In-kind support received: ${peso(t.inKind)} in value. Neither is counted as cash.`);

    if (rows.length) {
      heading("By event");
      for (const r of rows) row(`${r.title}${r.date ? ` (${day(r.date)})` : ""}: raised ${peso(r.cashIn)}, spent ${peso(r.spent)}, turned over ${peso(r.turnedOver)}`, peso(r.held));
      note("The amount on the right is what HoR holds from each.");
    }

    heading("Cash raised");
    if (!report.income.length) note("No cash raised yet.");
    for (const s of report.income) {
      row(s.label, peso(s.amount), { bold: true });
      for (const i of s.items) row(i.label, i.amount == null ? "" : peso(i.amount), { indent: 12, muted: true });
    }
    if (report.income.length) row("Total cash raised", peso(t.cashIn), { total: true });

    heading("Expenses");
    if (!report.expenses.length) note("No expenses recorded.");
    for (const s of report.expenses) {
      row(s.label, peso(s.amount), { bold: true });
      for (const i of s.items) row([day(i.date), i.label, i.party ? `paid to ${i.party}` : ""].filter(Boolean).join(" · "), peso(i.amount), { indent: 12, muted: true });
    }
    if (report.expenses.length) row("Total expenses", peso(t.spent), { total: true });
    note(`Every expense is backed by a receipt kept by HoR${t.missingProof ? ` (${t.missingProof} still missing one)` : ""}.`);

    heading("Turned over to beneficiaries");
    if (!report.turnovers.length) note("Nothing turned over yet.");
    for (const i of report.turnovers) row([day(i.date), i.label, i.form === "goods" ? `goods: ${i.description}` : i.description].filter(Boolean).join(" · "), peso(i.amount));
    if (report.turnovers.length) row("Total turned over", peso(t.turnedOver + t.goodsTurnedOver), { total: true });

    heading("In-kind support received");
    if (!report.inKind.length) note("No in-kind support recorded.");
    for (const i of report.inKind) row([i.label, i.quantity, i.party].filter(Boolean).join(" · "), i.amount == null ? "-" : peso(i.amount));
    note("Values are estimates and are not counted as cash.");

    if (report.pledges) {
      heading("Pledges not yet received");
      note(`${report.pledges.count} pledge${report.pledges.count === 1 ? "" : "s"} totalling ${peso(report.pledges.amount)}. Not counted until received.`);
    }

    doc.moveDown(0.6);
    note(`Donors and givers who asked not to be named are not named. A partner's or sponsor's amount is shown on its own only where they agreed; the totals always include every amount. ${t.donationsToCheck ? `${peso(t.donationsToCheck)} in donations is still being checked against HoR's account.` : "Every donation counted here has been checked against HoR's account."}`);

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(pages.start + i);
      // Writing below the bottom margin would start a new page: lift the margin for the footer line.
      const margin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      doc.font("Helvetica").fontSize(7.5).fillColor(MUTED).text(pdfSafe(`${LEGAL.org} · SEC Registration ${LEGAL.sec} · houseofretrieversph.org · Page ${i + 1} of ${pages.count}`), MARGIN, doc.page.height - MARGIN + 6, { width, align: "center", lineBreak: false });
      doc.page.margins.bottom = margin;
    }
    doc.end();
  });
}
