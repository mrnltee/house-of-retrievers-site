import test from "node:test";
import assert from "node:assert/strict";
import { MEDIA_MESSAGE_TO, cleanMediaMessage, mediaMessageEmail, messageType } from "./mediaMessage.mjs";

test("messages go to HOR's Gmail", () => {
  assert.equal(MEDIA_MESSAGE_TO, "houseofretrieversph@gmail.com");
});

test("an unknown type falls back to Story idea", () => {
  assert.equal(messageType("nope").key, "story");
  assert.equal(messageType("partnership").label, "Partnership");
});

test("name, a valid email and a real message are required", () => {
  const good = { type: "inquiry", name: " Ana  Cruz ", email: "Ana@Example.com ", message: "We'd like to feature your launch." };
  const ok = cleanMediaMessage(good);
  assert.equal(ok.ok, true);
  assert.equal(ok.value.name, "Ana Cruz");
  assert.equal(ok.value.email, "ana@example.com");
  assert.equal(cleanMediaMessage({ ...good, name: "" }).ok, false);
  assert.equal(cleanMediaMessage({ ...good, email: "not-an-email" }).ok, false);
  assert.equal(cleanMediaMessage({ ...good, message: "hi" }).ok, false);
});

test("the email escapes what was typed and names the type", () => {
  const { value } = cleanMediaMessage({ type: "story", name: "<b>Ana</b>", email: "ana@example.com", message: "Line one\nline <script>two</script>" });
  const mail = mediaMessageEmail(value);
  assert.match(mail.subject, /^\[Media hub · Story idea\]/);
  assert.ok(!mail.html.includes("<script>"));
  assert.ok(mail.html.includes("&lt;b&gt;Ana&lt;/b&gt;"));
  assert.match(mail.text, /Email: ana@example.com/);
});
