import { test } from "node:test";
import assert from "node:assert/strict";
import { applyEmailFrame, DEFAULT_EMAIL_FRAME, cleanEmailFrame, letterCoverEmail } from "./emailTemplates.mjs";

const mail = () => letterCoverEmail({ subject: "Hi", cover: "Dear Ana,\n\nHello there.", filename: "x.pdf", attached: false });

test("with nothing saved, emails are unchanged", () => {
  const m = mail();
  assert.deepEqual(applyEmailFrame(m, null), m);
  assert.deepEqual(applyEmailFrame(m, DEFAULT_EMAIL_FRAME), m);
  assert.match(m.html, /With love and purpose/);
});

test("a saved sign-off and footer replace HOR's standard ones in the email and its text", () => {
  const frame = { signoff: "Warmly,\n**Alyzza Angeles**\n*President*\n[houseofretrieversph.org](https://www.houseofretrieversph.org)", footer: "HOR · Manila <script>x</script>\nReply anytime." };
  const out = applyEmailFrame(mail(), frame);
  assert.match(out.html, /Warmly,<br><strong>Alyzza Angeles<\/strong><br><em>President<\/em><br><a class="em-link" href="https:\/\/www.houseofretrieversph.org"/);
  assert.ok(!out.html.includes("With love and purpose"));
  assert.match(out.html, /HOR · Manila &lt;script&gt;x&lt;\/script&gt;<br>Reply anytime\./);
  assert.ok(!out.html.includes("Reply to this email to reach the team"));
  assert.match(out.text, /Warmly,\nAlyzza Angeles\nPresident\nhouseofretrieversph\.org \(https:\/\/www\.houseofretrieversph\.org\)/);
  assert.match(out.text, /HOR · Manila <script>x<\/script>\nReply anytime\./);
  assert.ok(!out.text.includes("With love and purpose"));
});

test("checks: lengths, unsafe links", () => {
  assert.equal(cleanEmailFrame({ signoff: " A ", footer: " B " }).frame.signoff, "A");
  assert.match(cleanEmailFrame({ signoff: "x".repeat(601), footer: "" }).error, /sign-off/i);
  assert.match(cleanEmailFrame({ signoff: "[a](javascript:alert(1))", footer: "" }).error, /link/i);
});
