import { test } from "node:test";
import assert from "node:assert/strict";
import { KINDS, cleanDoc, cleanHtml, toHex } from "./emailDesign.mjs";

test("colours: hex, rgb and hsl become #rrggbb; other words don't", () => {
  assert.equal(toHex("#abc"), "#aabbcc");
  assert.equal(toHex("#A78440"), "#a78440");
  assert.equal(toHex("rgb(300, 0, -5)"), "#ff0000");
  assert.equal(toHex("rgb(167 132 64)"), "#a78440");
  assert.equal(toHex("hsl(120 100% 25%)"), "#008000");
  assert.equal(toHex("hsl(400, 50%, 50%)"), toHex("hsl(40, 50%, 50%)"));
  assert.equal(toHex("gold"), "");
  assert.equal(toHex(""), "");
});

test("cleanHtml keeps only safe formatting", () => {
  assert.equal(cleanHtml("<b>x</b> <i>y</i>"), "<strong>x</strong> <em>y</em>");
  assert.equal(cleanHtml('<p onclick="a()">Hi<script>alert(1)</script></p>'), "<p>Hi</p>");
  assert.equal(cleanHtml('<img src=x onerror="alert(1)">ok'), "ok");
  assert.equal(cleanHtml('<a href="javascript:alert(1)">bad</a>'), "bad");
  assert.equal(cleanHtml('<a href="https://hor.ph/x?a=1&b=2" style="color:red">go</a>'), '<a href="https://hor.ph/x?a=1&amp;b=2" target="_blank">go</a>');
  assert.equal(cleanHtml('<span style="color: rgb(167, 132, 64); font-size: 18px; background: url(x)">t</span>'), '<span style="color:#a78440;font-size:18px">t</span>');
  assert.equal(cleanHtml('<span style="font-size:99px">t</span>'), "t");
  assert.equal(cleanHtml("<div>one</div><div>two</div>"), "<p>one</p><p>two</p>");
  assert.equal(cleanHtml("a < b & c"), "a &lt; b &amp; c");
  assert.equal(cleanHtml("<ul><li>a</li></ul><br>"), "<ul><li>a</li></ul><br>");
});

test("cleanDoc checks blocks and clamps numbers", () => {
  const ok = cleanDoc({ body: { style: { padding: [500, 0, 0, 0], background: "rgb(245,241,230)" }, blocks: [{ type: "text", html: "<b>Hi</b>", style: { align: "center" } }, { type: "image", src: "/api/event-image/0b1d5c3e-1111-4222-8333-444455556666", width: 300 }] } });
  assert.equal(ok.error, undefined);
  assert.deepEqual(ok.doc.body.style.padding, [80, 0, 0, 0]);
  assert.equal(ok.doc.body.style.background, "#f5f1e6");
  assert.equal(ok.doc.body.blocks[0].html, "<strong>Hi</strong>");
  assert.equal(ok.doc.body.blocks[1].width, 100);
  assert.match(cleanDoc({ body: { blocks: [{ type: "video" }] } }).error, /video/);
  assert.match(cleanDoc({ body: { blocks: [{ type: "image", src: "http://evil.example/x.png" }] } }).error, /picture/i);
  assert.match(cleanDoc({ body: { blocks: [{ type: "button", label: "Go", href: "javascript:x" }] } }).error, /link/i);
  assert.equal(KINDS.length, 5);
});

test("render: zone background, margin as outer padding, columns, absolute images", async () => {
  const { renderDesign } = await import("./emailDesign.mjs");
  const { HOME_URL } = await import("./siteSeo.mjs");
  const doc = cleanDoc({
    ownHeader: true, ownFooter: true,
    header: { blocks: [] }, footer: { blocks: [] },
    body: { style: { background: "#F5F1E6" }, blocks: [
      { type: "text", html: "<p>Hello</p>", style: { margin: [0, 0, 12, 0], padding: [8, 16, 8, 16] } },
      { type: "columns", count: 2, cols: [{ blocks: [{ type: "text", html: "A" }] }, { blocks: [{ type: "text", html: "B" }] }] },
      { type: "image", src: "/api/event-image/0b1d5c3e-1111-4222-8333-444455556666", width: 50, alt: "Banner" },
      { type: "button", label: "Event page", href: "[Event Link]" },
    ] },
  }).doc;
  const { html, text } = renderDesign(doc, { subject: "Hi" });
  assert.match(html, /background:#f5f1e6/);
  assert.match(html, /padding:0px 0px 12px 0px/);
  assert.match(html, /padding:8px 16px 8px 16px/);
  assert.equal((html.match(/class="ed-col"/g) || []).length, 2);
  assert.ok(html.includes(`src="${HOME_URL}/api/event-image/0b1d5c3e-1111-4222-8333-444455556666"`));
  assert.ok(!html.includes("Event page"), "a button whose link isn't filled in is left out");
  assert.match(text, /Hello/);
  assert.match(text, /\[Banner\]/);
});

test("house header and footer are used unless the design has its own", async () => {
  const { renderDesign, HOUSE_DEFAULT } = await import("./emailDesign.mjs");
  const { LEGAL } = await import("./legal.mjs");
  const doc = cleanDoc({ footer: { blocks: [{ type: "text", html: "Own footer" }] }, body: { blocks: [{ type: "text", html: "Body" }] } }).doc;
  const shared = renderDesign(doc, { house: HOUSE_DEFAULT, subject: "x" }).html;
  assert.ok(shared.includes(`SEC Registration: ${LEGAL.sec}`));
  assert.ok(!shared.includes("Own footer"));
  const own = renderDesign({ ...doc, ownFooter: true }, { subject: "x" }).html;
  assert.ok(own.includes("Own footer"));
  assert.ok(renderDesign(doc, { house: null, subject: "x" }).html.includes(LEGAL.sec), "no house row yet → HOR default");
});

test("fill-ins are escaped in the email and plain in the text; blanks are found", async () => {
  const { fillDesign, renderDesign, designTexts, STARTERS } = await import("./emailDesign.mjs");
  const { blanksOf } = await import("./letters.mjs");
  const doc = cleanDoc({ ownHeader: true, ownFooter: true, body: { blocks: [{ type: "text", html: "Dear [Salutation], about [Booth Size]" }, { type: "button", label: "Open", href: "[Event Link]" }] } }).doc;
  const values = { Salutation: "<b>Tom & Co</b>", "Booth Size": "3x3", "Event Link": "https://events.houseofretrieversph.org/x" };
  const fill = (t, { html }) => t.replace(/\[([^\]]+)\]/g, (_, k) => (html ? values[k].replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]) : values[k]));
  const filled = fillDesign(doc, "Hi [Salutation]", fill);
  assert.equal(filled.subject, "Hi <b>Tom & Co</b>");
  const out = renderDesign(filled.doc, { subject: filled.subject });
  assert.ok(out.html.includes("Dear &lt;b&gt;Tom &amp; Co&lt;/b&gt;,"));
  assert.ok(out.text.includes("Dear <b>Tom & Co</b>,"));
  assert.ok(out.html.includes('href="https://events.houseofretrieversph.org/x"'));
  assert.deepEqual(blanksOf(...designTexts(doc, "Hi [Salutation]")).map((b) => b.label).sort(), ["Booth Size", "Event Link"]);
  for (const [kind] of KINDS) assert.equal(cleanDoc(STARTERS[kind].doc).error, undefined, kind);
});
