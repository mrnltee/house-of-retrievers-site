import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { MEDIA_HERO_SLIDES } from "./mediaHeroSlides.mjs";

test("the hero slideshow starts on the poster the CSS shows as its fallback", () => {
  const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
  const rule = css.match(/\.media-hero \{[^}]*\}/)[0];
  assert.match(rule, new RegExp(`url\\('${MEDIA_HERO_SLIDES[0].src}'\\)`));
});

test("every hero slide is a file in public/, listed once", () => {
  const srcs = MEDIA_HERO_SLIDES.map((s) => s.src);
  assert.equal(new Set(srcs).size, srcs.length);
  for (const src of srcs) assert.ok(existsSync(new URL(`../../public${src}`, import.meta.url)), src);
});
