import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_HERO_SLIDESHOW, HERO_MAX_SLIDES, HERO_PHOTO_CHOICES, cleanHeroSlideshow, heroSlides } from "./mediaHeroSlides.mjs";

test("the built-in slideshow starts on the poster the CSS shows as its fallback", () => {
  const css = readFileSync(new URL("../globals.css", import.meta.url), "utf8");
  const rule = css.match(/\.media-hero \{[^}]*\}/)[0];
  assert.match(rule, new RegExp(`url\\('${DEFAULT_HERO_SLIDESHOW.slides[0].src}'\\)`));
});

test("every photo HoR can choose is a file in public/, listed once, with a description", () => {
  const srcs = HERO_PHOTO_CHOICES.map((c) => c.src);
  assert.equal(new Set(srcs).size, srcs.length);
  for (const choice of HERO_PHOTO_CHOICES) {
    assert.ok(existsSync(new URL(`../../public${choice.src}`, import.meta.url)), choice.src);
    assert.ok(choice.label && choice.alt, choice.src);
  }
  for (const slide of DEFAULT_HERO_SLIDESHOW.slides) assert.ok(srcs.includes(slide.src), slide.src);
});

test("nothing saved, or something unreadable, gives the built-in slideshow", () => {
  assert.deepEqual(cleanHeroSlideshow(undefined), DEFAULT_HERO_SLIDESHOW);
  assert.deepEqual(cleanHeroSlideshow("not json"), DEFAULT_HERO_SLIDESHOW);
  assert.deepEqual(cleanHeroSlideshow(JSON.stringify(DEFAULT_HERO_SLIDESHOW)), DEFAULT_HERO_SLIDESHOW);
});

test("only known photos, once each, up to the cap; an unknown crop becomes the middle", () => {
  const all = HERO_PHOTO_CHOICES.map((c) => ({ src: c.src, focus: "top" }));
  const clean = cleanHeroSlideshow({ slides: [{ src: "https://evil.example/x.jpg" }, { src: all[1].src, focus: "sideways" }, { src: all[1].src }, ...all] });
  assert.equal(clean.slides.length, HERO_MAX_SLIDES);
  assert.deepEqual(clean.slides[0], { src: all[1].src, focus: "center" });
  assert.equal(new Set(clean.slides.map((s) => s.src)).size, clean.slides.length);
  assert.deepEqual(cleanHeroSlideshow({ slides: [] }).slides, DEFAULT_HERO_SLIDESHOW.slides);
});

test("timings stay in range, and a photo stays at least two seconds clear of its fade", () => {
  assert.deepEqual([cleanHeroSlideshow({ seconds: 99, fade: 99 }).seconds, cleanHeroSlideshow({ seconds: 99, fade: 99 }).fade], [12, 4]);
  assert.deepEqual([cleanHeroSlideshow({ seconds: 1, fade: 0 }).seconds, cleanHeroSlideshow({ seconds: 1, fade: 0 }).fade], [4, 0.8]);
  assert.equal(cleanHeroSlideshow({ seconds: 4, fade: 3.5 }).seconds, 6);
  assert.equal(cleanHeroSlideshow({ seconds: 6.3, fade: 2 }).seconds, 6.5);
});

test("switched off draws nothing, so the still poster shows; on, each slide carries its crop", () => {
  assert.deepEqual(heroSlides({ ...DEFAULT_HERO_SLIDESHOW, on: false }), []);
  const slides = heroSlides({ slides: [{ src: "/2-better/better2.jpg", focus: "bottom" }] });
  assert.equal(slides[0].position, "center 75%");
  assert.match(slides[0].alt, /surf shop/);
});
