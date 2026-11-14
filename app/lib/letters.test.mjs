import test from "node:test";
import assert from "node:assert/strict";
import { LETTER_STARTERS, blanksOf, fillLetter, letterBlocks, letterDate, letterWithOverride, missingBlanks, prepareLetter, recipientFields, recipientName } from "./letters.mjs";
import { letterPdf, pdfSafe } from "./letterPdf.mjs";

test("the eleven starter letters are there, each with a subject", () => {
  assert.equal(LETTER_STARTERS.length, 11);
  assert.equal(new Set(LETTER_STARTERS.map((l) => l.key)).size, 11);
  for (const l of LETTER_STARTERS) {
    assert.ok(l.subject, l.key);
    if (l.key === "open-donation-letter") continue; // no addressee: its own test below
    // The guests-of-honor letter is written to Senator Zubiri by name.
    assert.match(l.cover, l.key === "invite-guests-of-honor" ? /^Dear Senator Zubiri,/ : /^Dear \[Salutation\],/, l.key);
    if (l.key !== "invite-guests-of-honor") assert.match(l.body, /\[Their Contact Person\?\]\n\[Company Name\]\n\[Address\?\]/, l.key);
  }
});

test("covering emails (owner's brief, 2026-10-27): portfolio link, official name, no \"beyond\"", () => {
  const portfolio = "[Partnership Portfolio](https://www.canva.com/design/DAHWLsiZugc/7RGzvgYEMCjGc67tzRlW2w/view)";
  for (const l of LETTER_STARTERS) {
    assert.ok(l.cover.includes(portfolio), `${l.key}: portfolio link`);
    assert.match(l.cover, /The House of Retrievers’ Society, Inc\./, l.key); // owner, 2026-10-31
    assert.doesNotMatch(`${l.subject} ${l.cover}`, /beyond/i, l.key);
    if (l.attachPdf !== false) assert.match(l.cover, /attached/i, `${l.key}: mentions the attachment`);
    assert.ok(l.cover.length <= 2000, l.key);
  }
  assert.equal(new Set(LETTER_STARTERS.map((l) => l.cover)).size, 11, "each cover is its own");
  assert.deepEqual(blanksOf(`See our ${portfolio}.`).map((b) => b.label), []);
});

test("blanks: automatic ones are not asked for; optional and suggested ones are marked", () => {
  const blanks = blanksOf("Hi [Company Name] [Date] [Salutation]", "[Address?]\n[Their Contact Person?]\n[Reply Date] and [Contact Person] [Reply Date]", "[Note?] [Proposed: Non-exclusive.]");
  assert.deepEqual(blanks.map((b) => b.label), ["Reply Date", "Contact Person", "Note", "Proposed: Non-exclusive."]);
  assert.equal(blanks[2].optional, true);
  assert.equal(blanks[3].suggestion, "Non-exclusive.");
  assert.deepEqual(missingBlanks(blanks, { "Proposed: Non-exclusive.": "x" }), ["Reply Date", "Contact Person"]);
});

test("filling: the company name everywhere, the date, and an empty optional line disappears", () => {
  const text = "[Date]\n[Company Name]\n[Address?]\n\nDear [Company Name]:\n\nReply by [Reply Date].";
  const out = fillLetter(text, { name: "Bark Boulevard PH", date: "October 24, 2026", values: { "Reply Date": "Nov 6" } });
  assert.equal(out, "October 24, 2026\nBark Boulevard PH\n\nDear Bark Boulevard PH:\n\nReply by Nov 6.");
  assert.match(fillLetter("[Address?]", { address: "Pasay" }), /^Pasay$/);
});

test("the recipient is always the company; for people, their organization, else their name", () => {
  assert.equal(recipientName({ supporter: { name: "GRWM Cosmetics" } }), "GRWM Cosmetics");
  assert.equal(recipientName({ person: { name: "Ana Cruz", organization: "Paws Inc." } }), "Paws Inc.");
  assert.equal(recipientName({ person: { name: "Ana Cruz", organization: "" } }), "Ana Cruz");
});

test("markup: headings, centred lines, bullets, bold, tables and page breaks", () => {
  const blocks = letterBlocks("# TITLE\n\n## Part\n\n^ centred\n\n- **One.** first\n- two\n\n|! A | B |\n| x // y | **z** |\n\n---page---\n\nplain");
  assert.deepEqual(blocks.map((b) => b.type), ["h1", "h2", "center", "bullet", "bullet", "table", "page", "p"]);
  assert.deepEqual(blocks[3].runs, [{ text: "One.", bold: true }, { text: " first", bold: false }]);
  const [head, row] = blocks[5].rows;
  assert.equal(head.header, true);
  assert.equal(row.cells[0][0].text, "x\ny");
  assert.equal(row.cells[1][0].bold, true);
});

test("tables are capped at 12 columns (the rest folds into the last cell) and 400 rows", () => {
  const wide = `| ${Array.from({ length: 30 }, (_, i) => `c${i}`).join(" | ")} |`;
  const [table] = letterBlocks(wide);
  assert.equal(table.rows[0].cells.length, 12);
  assert.match(table.rows[0].cells[11][0].text, /^c11 \/ c12 \/ .* c29$/);
  const tall = Array.from({ length: 500 }, () => "| a | b |").join("\n");
  assert.equal(letterBlocks(tall)[0].rows.length, 400);
});

test("a saved wording replaces the starter, field by field", () => {
  const l = letterWithOverride("invite-media", { name: "Media invite", subject: "", cover: "Hello [Company Name]", body: "Body" });
  assert.equal(l.name, "Media invite");
  assert.equal(l.cover, "Hello [Company Name]");
  assert.ok(l.subject.length > 0);
  assert.equal(letterWithOverride("nope", null), null);
});

test("every starter fills in and renders to a PDF", async () => {
  for (const letter of LETTER_STARTERS) {
    const blanks = blanksOf(letter.subject, letter.cover, letter.body);
    const values = Object.fromEntries(blanks.map((b) => [b.label, b.suggestion || "Sample"]));
    const p = prepareLetter(letter, { name: "Bark Boulevard PH", date: letterDate(new Date("2026-10-24T03:00:00Z")), values });
    assert.doesNotMatch(p.cover, /\[[^\]]+\](?!\(https:)/, `${letter.key}: cover still has a blank`);
    assert.match(p.cover, letter.key === "invite-guests-of-honor" ? /^Dear Senator Zubiri,/ : letter.key === "open-donation-letter" ? /^Hi!/ : /^Dear Bark Boulevard PH,/);
    const pdf = await letterPdf(p.blocks, { title: p.subject });
    assert.equal(pdf.subarray(0, 5).toString(), "%PDF-", letter.key);
  }
});

test("PDF text: peso sign and check boxes the standard fonts lack", () => {
  assert.equal(pdfSafe("₱100,000 ☐ Gold"), "PHP 100,000 [  ] Gold");
  assert.equal(pdfSafe("“Quotes” — ok"), "“Quotes” — ok");
  assert.equal(pdfSafe("emoji 🐶 gone"), "emoji  gone");
});

test("a short letter is one PDF page (no blank page from the footer)", async () => {
  const buf = await letterPdf([{ type: "p", runs: [{ text: "Hello. ".repeat(40) }] }]);
  assert.equal((buf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1);
});

test("a few spilled lines don't make a near-empty extra page (letters tighten a step instead)", async () => {
  for (const key of ["invite-media", "invite-guest-speaker", "invite-creators"]) {
    const letter = LETTER_STARTERS.find((l) => l.key === key);
    const values = Object.fromEntries(blanksOf(letter.subject, letter.cover, letter.body).map((b) => [b.label, b.suggestion || `Sample ${b.label}`]));
    const pdf = await letterPdf(prepareLetter(letter, { name: "House of Retrievers Test", values }).blocks);
    assert.equal((pdf.toString("latin1").match(/\/Type \/Page\b/g) || []).length, 1, key);
  }
});

test("a covering email's [label](https://…) is a real link in the email and spelled out in plain text", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const mail = letterCoverEmail({ subject: "Hi", cover: "Dear Bark,\n\nSee our [Partnership Portfolio](https://www.canva.com/design/x/view).", filename: "a.pdf" });
  assert.match(mail.html, /<a class="em-text-link" href="https:\/\/www\.canva\.com\/design\/x\/view"[^>]*>Partnership Portfolio<\/a>/);
  assert.match(mail.text, /Partnership Portfolio \(https:\/\/www\.canva\.com\/design\/x\/view\)/);
  const unsafe = letterCoverEmail({ subject: "Hi", cover: "[x](javascript:alert(1))", filename: "a.pdf" });
  assert.doesNotMatch(unsafe.html, /href="javascript/);
});

test("a name or value can't smuggle a link into a covering email", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const letter = { name: "X", subject: "Hi", cover: "Dear [Company Name],\n\nNote: [Note]\n\nSee our [Partnership Portfolio](https://www.canva.com/design/x/view).", body: "B" };
  const p = prepareLetter(letter, { name: "[Click here](https://evil.example)", values: { Note: "[win](https://evil.example)" } });
  const mail = letterCoverEmail({ subject: p.subject, cover: p.cover, filename: p.filename });
  assert.doesNotMatch(mail.html, /href="https:\/\/evil/);
  assert.match(mail.html, /href="https:\/\/www\.canva\.com\/design\/x\/view"/);
});

test("a page break never leaves a blank page (doubled, at the start of a page, or at the end)", async () => {
  const count = async (body) => ((await letterPdf(letterBlocks(body))).toString("latin1").match(/\/Type \/Page\b/g) || []).length;
  assert.equal(await count("One\n\n---page---\n\nTwo"), 2);
  assert.equal(await count("One\n\n---page---\n\n---page---\n\nTwo"), 2);
  assert.equal(await count("One\n\n---page---"), 1);
  assert.equal(await count("---page---\n\nOne"), 1);
});

test("every blank in the starter letters has a sample answer for the send form", async () => {
  const { blankSample } = await import("./letters/samples.mjs");
  for (const l of LETTER_STARTERS) {
    for (const b of blanksOf(l.subject, l.cover, l.body)) {
      if (b.suggestion) continue; // starts filled in with its suggestion
      assert.ok(blankSample(b.label, l.key), `${l.key}: no sample for [${b.label}]`);
    }
  }
});

test("the covering email tells people to open the PDF in a PDF viewer, not Google Docs", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const mail = letterCoverEmail({ subject: "Hi", cover: "Dear Bark,\n\nHello.", filename: "a.pdf" });
  assert.match(mail.text, /Adobe Acrobat Reader/);
  assert.match(mail.text, /rather than Google Docs/);
});

test("address block fills from the record; empty optional lines drop", async () => {
  const { fillLetter, recipientFields } = await import("./letters.mjs");
  const head = "[Their Contact Person?]\n[Company Name]\n[Address?]\n\nDear [Salutation]:";
  const full = recipientFields({ supporter: { name: "Modeler Collection", contact_name: "Jessie Mae Gabriel", address: "1 Main St.\nQuezon City", salutation: "Ms. Jessie" } });
  assert.equal(fillLetter(head, full), "Jessie Mae Gabriel\nModeler Collection\n1 Main St.\nQuezon City\n\nDear Ms. Jessie:");
  const bare = recipientFields({ supporter: { name: "Pawsome" } });
  assert.equal(fillLetter(head, bare), "Pawsome\n\nDear Pawsome Team:");
  const guest = recipientFields({ contact: { name: "Jessie Mae Gabriel", organization: "Modeler Collection" } });
  assert.equal(fillLetter(head, guest), "Jessie Mae Gabriel\nModeler Collection\n\nDear Jessie Mae Gabriel:");
  const celeb = recipientFields({ contact: { name: "Anne Curtis", salutation: "Ms. Anne" } });
  assert.equal(fillLetter(head, celeb), "Anne Curtis\n\nDear Ms. Anne:");
});

test("letters agree on the facts (owner, 2026-10-31): 3:00 PM, “A Golden Beginning: Paws & Purpose”, the org's name", () => {
  for (const l of LETTER_STARTERS) {
    const text = `${l.subject}\n${l.cover}\n${l.body}`;
    assert.doesNotMatch(text, /2:00 PM/, l.key);
    assert.doesNotMatch(text, /A Golden Beginning ?[-–—] ?Paws/, l.key);
    assert.doesNotMatch(text, /The House of Retrievers Society Inc/, l.key);
  }
});

test("the org is written “The House of Retrievers’ Society, Inc.” (owner, 2026-11-12)", async () => {
  const { readFileSync } = await import("node:fs");
  for (const f of ["app/lib/legal.mjs", "app/lib/siteSeo.mjs", "app/lib/mediaPressKit.mjs", "app/components/LogoMoments.jsx", "app/media/page.jsx"]) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), "utf8");
    assert.doesNotMatch(src, /House of Retrievers Society Inc/, f);
  }
});

test("letters name HOR's beneficiaries (owner, 2026-10-31), not “selected animal shelters”", () => {
  for (const l of LETTER_STARTERS.filter((x) => x.key !== "beneficiary-proposal")) {
    const text = `${l.cover}\n${l.body}`;
    assert.doesNotMatch(text, /(selected|chosen) (animal )?shelters/i, l.key);
  }
  for (const key of ["sponsorship-letter", "donation-letter", "invite-media"]) {
    const l = LETTER_STARTERS.find((x) => x.key === key);
    assert.match(l.cover, /Pawssion Project Foundation Inc\..*Little Sisters of the Abandoned Elderly – Sta\. Teresa Jornet Home/, key);
  }
});

test("the event's name is a fill-in, set once in Standard details (owner, 2026-10-31)", () => {
  for (const l of LETTER_STARTERS) assert.doesNotMatch(`${l.subject}\n${l.cover}\n${l.body}`, /A Golden Beginning/, l.key);
  const out = fillLetter("Join us at “**[Event Name]**” ([Event Short Name]).", { values: { "Event Name": "A Golden Beginning: Paws & Purpose", "Event Short Name": "A Golden Beginning" } });
  assert.equal(out, "Join us at “**A Golden Beginning: Paws & Purpose**” (A Golden Beginning).");
});

test("the open donation letter has no addressee, so it can go out in any DM", () => {
  const letter = LETTER_STARTERS.find((l) => l.key === "open-donation-letter");
  const blanks = blanksOf(letter.subject, letter.cover, letter.body).map((b) => b.label);
  for (const auto of ["Company Name", "Salutation", "Their Contact Person", "Address"]) assert.ok(!blanks.includes(auto), auto);
  assert.match(letter.body, /CASH DONATION FORM/);
  assert.match(letter.body, /\[HOR Account Number\]/);
});

test("a brand or organization with no contact person is greeted as its team", () => {
  const filled = (to) => fillLetter("Dear [Salutation],", to);
  assert.equal(filled(recipientFields({ supporter: { name: "Apple" } })), "Dear Apple Team,");
  assert.equal(filled(recipientFields({ supporter: { name: "Apple", contact_name: "Tim Cook" } })), "Dear Tim Cook,");
  assert.equal(filled(recipientFields({ supporter: { name: "Apple", salutation: "Mr. Cook" } })), "Dear Mr. Cook,");
  assert.equal(filled(recipientFields({ supporter: { name: "GRWM Team" } })), "Dear GRWM Team,");
  assert.equal(filled(recipientFields({ beneficiary: { name: "Pawssion Project" } })), "Dear Pawssion Project Team,");
  assert.equal(filled(recipientFields({ contact: { category: "sponsor", name: "Aquaflask" } })), "Dear Aquaflask Team,");
  assert.equal(filled(recipientFields({ contact: { category: "sponsor", name: "Jessie", organization: "Aquaflask" } })), "Dear Jessie,");
  assert.equal(filled(recipientFields({ contact: { category: "donor", name: "Jessie Gabriel" } })), "Dear Jessie Gabriel,");
});

test("a brand's greeting choice: contact person, brand team, or own wording", () => {
  const dear = (supporter) => fillLetter("Dear [Salutation],", recipientFields({ supporter }));
  const apple = { name: "Apple", contact_name: "Tim Cook", salutation: "Mr. Cook" };
  assert.equal(dear({ ...apple, greeting: "auto" }), "Dear Mr. Cook,");
  assert.equal(dear({ ...apple, greeting: "contact" }), "Dear Tim Cook,");
  assert.equal(dear({ ...apple, greeting: "team" }), "Dear Apple Team,");
  assert.equal(dear({ ...apple, greeting: "custom" }), "Dear Mr. Cook,");
  assert.equal(dear({ name: "Apple", greeting: "contact" }), "Dear Apple Team,", "no contact person yet: the team");
  assert.equal(dear({ name: "Apple", contact_name: "Tim Cook" }), "Dear Tim Cook,", "no choice saved: automatic");
});

test("an email-only letter (no PDF): the cover email is the whole message, with no attachment note", async () => {
  const { letterCoverEmail } = await import("./emailTemplates.mjs");
  const cover = "Dear Bark & Co team,\n\nWe would love you to join **PAWS & POSES**.\n\nSee our [Partnership Portfolio](https://canva.link/hor).";
  const withPdf = letterCoverEmail({ subject: "Invite", cover, filename: "HOR letter.pdf" });
  const only = letterCoverEmail({ subject: "Invite", cover, filename: "HOR letter.pdf", attached: false });
  assert.match(withPdf.html, /attached as a PDF/);
  assert.ok(!/attached/i.test(only.html) && !/attached/i.test(only.text));
  assert.match(only.html, /<strong[^>]*>PAWS &amp; POSES<\/strong>/);
  assert.equal((only.html.match(/Reply to this email/g) || []).length, 1);
  assert.match(only.html, /Partnership Portfolio/);
  assert.match(only.text, /Reply to this email/);
});

test("wording edits for one send: one brand, all brands, checks", async () => {
  const { wordingFor, cleanEdits } = await import("./letters.mjs");
  const letter = { key: "x", subject: "Hi [Event Name]", cover: "Dear [Salutation],", body: "Letter" };
  const refs = ["supporter:a", "supporter:b"];
  const { edits } = cleanEdits(JSON.stringify({ all: { subject: "All brands", cover: "Dear all,", body: "Letter v2" }, byRef: { "supporter:a": { subject: "Just A", cover: "Dear A,", body: "For A only" }, "supporter:zzz": { subject: "x", cover: "x", body: "x" } } }), refs);
  assert.equal(wordingFor(letter, edits, "supporter:a").body, "For A only");
  assert.equal(wordingFor(letter, edits, "supporter:b").subject, "All brands");
  assert.equal(wordingFor(letter, null, "supporter:b"), letter);
  assert.ok(!("supporter:zzz" in edits.byRef), "edits for someone not in the send are dropped");
  assert.match(cleanEdits(JSON.stringify({ all: { subject: "", cover: "a", body: "b" } }), refs).error, /subject/i);
  assert.match(cleanEdits(JSON.stringify({ all: { subject: "a", cover: "x".repeat(9000), body: "b" } }), refs).error, /email/i);
  assert.deepEqual(cleanEdits("", refs).edits, { all: null, byRef: {} });
  assert.match(cleanEdits("{oops", refs).error, /come through/);
});

test("the brand follow-up is email only, for the event it's sent from", () => {
  const starter = LETTER_STARTERS.find((l) => l.key === "brand-follow-up");
  assert.equal(starter.attachPdf, false);
  assert.equal(letterWithOverride("brand-follow-up", null).attachPdf, false);
  assert.equal(letterWithOverride("sponsorship-letter", null).attachPdf, true);
  assert.equal(letterWithOverride("brand-follow-up", { attach_pdf: true, name: "", subject: "", cover: "", body: "" }).attachPdf, true, "HOR can switch the PDF on");
  for (const fill of ["[Event Name]", "[Event Date]", "[Event Location]", "[Company Name]"]) assert.ok(starter.cover.includes(fill), fill);
  assert.doesNotMatch(starter.cover, /attached/i);
});
