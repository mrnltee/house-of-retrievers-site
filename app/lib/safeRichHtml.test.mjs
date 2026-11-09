import { test } from "node:test";
import assert from "node:assert/strict";
import { safeHref, safeRichHtml } from "./safeRichHtml.mjs";

test("keeps the allowed formatting as it was", () => {
  assert.equal(safeRichHtml("A house with<br><em>a purpose.</em>"), "A house with<br><em>a purpose.</em>");
  assert.equal(safeRichHtml("<strong>Bold</strong> and <b>b</b> <i>i</i>"), "<strong>Bold</strong> and <strong>b</strong> <em>i</em>");
  assert.equal(safeRichHtml("We&apos;re furparents · 17 May"), "We&apos;re furparents · 17 May");
  assert.equal(safeRichHtml("Ayala & Makati"), "Ayala &amp; Makati");
  assert.equal(
    safeRichHtml('<a href="https://example.org/x?a=1&amp;b=2">site</a>'),
    '<a href="https://example.org/x?a=1&amp;b=2" rel="noopener noreferrer">site</a>',
  );
  assert.equal(safeRichHtml('<a href="mailto:houseofretrieversph@gmail.com">mail</a>'), '<a href="mailto:houseofretrieversph@gmail.com">mail</a>');
  assert.equal(safeRichHtml("<a href='/events'>events</a>"), '<a href="/events">events</a>');
});

test("removes event handlers however they are written", () => {
  for (const input of [
    "<a/onclick=alert(1) href=https://x.test>x</a>",
    "<a\nonclick=alert(1)>x</a>",
    "<a\tonmouseover=alert(1)>x</a>",
    '<strong onclick="alert(1)">x</strong>',
    "<br/onload=alert(1)>",
  ]) {
    const out = safeRichHtml(input);
    assert.doesNotMatch(out, /on[a-z]+\s*=/i, input);
  }
});

test("refuses script links, including disguised ones", () => {
  for (const href of [
    "javascript:alert(1)",
    "javajavascript:script:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\tscript:alert(1)",
    "jav&#x61;script:alert(1)",
    "jav&#97;script:alert(1)",
    "javascript&colon;alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "//evil.test",
    "/\\evil.test",
  ]) {
    assert.equal(safeHref(href), null, href);
    assert.doesNotMatch(safeRichHtml(`<a href="${href}">x</a>`), /href/i, href);
  }
});

test("drops other tags and escapes stray brackets", () => {
  assert.equal(safeRichHtml('<img src=x onerror=alert(1)>hi'), "hi");
  assert.equal(safeRichHtml("<script>alert(1)</script>ok"), "ok");
  assert.equal(safeRichHtml("<svg><script>alert(1)</script></svg>ok"), "ok");
  assert.equal(safeRichHtml("<iframe src=//x></iframe>ok"), "ok");
  assert.equal(safeRichHtml("<!-- <img src=x onerror=alert(1)> -->ok"), "ok");
  assert.equal(safeRichHtml("1 < 2 and 3 > 2"), "1 &lt; 2 and 3 &gt; 2");
  assert.equal(safeRichHtml("<<img src=x onerror=alert(1)>>"), "&lt;&gt;");
  assert.equal(safeRichHtml('<a href="x>y" onclick=alert(1)>z</a>'), '<a>y" onclick=alert(1)&gt;z</a>');
  assert.equal(safeRichHtml(null), "");
});
