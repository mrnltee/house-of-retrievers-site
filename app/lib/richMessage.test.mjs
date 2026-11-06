import test from "node:test";
import assert from "node:assert/strict";
import { htmlToMarkup, markupToHtml } from "./richMessage.mjs";

const SAMPLE = "A friendly reminder that **{{event_title}}** is coming up.\n\nA few things to remember:\n• Show your QR pass below.\n• Arrive early.\n\nSee [Parklinks](https://www.canvaqr.com/RGWNI2ketU) & more.";

test("markup survives the editor and back", () => {
  assert.equal(htmlToMarkup(markupToHtml(SAMPLE)), SAMPLE);
});

test("a plain paragraph with line breaks round-trips exactly", () => {
  const text = "**Bedazzle Barkdate**\nSat, Oct 17\nWiltlover Café, Pasay";
  assert.equal(htmlToMarkup(markupToHtml(text)), text);
});

test("what Chrome's contenteditable makes is understood", () => {
  assert.equal(htmlToMarkup("Hello <b>there</b><div>second<br>line</div><div><br></div><div>third</div>"), "Hello **there**\n\nsecond\nline\n\nthird");
  assert.equal(htmlToMarkup('<p>Go <a href="https://example.com/x">here</a></p>'), "Go [here](https://example.com/x)");
  assert.equal(htmlToMarkup('<p>Bad <a href="javascript:alert(1)">link</a></p>'), "Bad link");
  assert.equal(htmlToMarkup("<p>a &amp; b &lt;c&gt;</p>"), "a & b <c>");
  assert.equal(htmlToMarkup("<p><b> bold </b>x</p>"), "**bold** x");
  assert.equal(htmlToMarkup("<p><b></b>x</p>"), "x");
});

test("HTML from markup is escaped", () => {
  assert.equal(markupToHtml("<script>x</script>"), "<p>&lt;script&gt;x&lt;/script&gt;</p>");
});
