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
