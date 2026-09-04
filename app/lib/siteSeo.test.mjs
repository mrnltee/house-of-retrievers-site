import test from "node:test";
import assert from "node:assert/strict";

async function loadSeo() {
  return import("./siteSeo.mjs").catch(() => ({}));
}

test("uses the approved brand title and an accurate launch description", async () => {
  const seo = await loadSeo();

  assert.equal(seo.SITE_TITLE, "House of Retrievers PH | Paws for a Purpose");
  assert.equal(
    seo.SITE_DESCRIPTION,
    "House of Retrievers PH brings responsible furparents and furbabies together to support animal rescues, serve communities, and create meaningful memories.",
  );
  assert.doesNotMatch(seo.SITE_DESCRIPTION, /registered|nonprofit/i);
});

test("identifies the website and organization consistently for search engines", async () => {
  const seo = await loadSeo();
  const graph = seo.structuredData?.["@graph"] ?? [];
  const website = graph.find((entry) => entry["@type"] === "WebSite");
  const organization = graph.find((entry) => entry["@type"] === "Organization");

  assert.equal(website?.name, "House of Retrievers PH");
  assert.deepEqual(website?.alternateName, ["House of Retrievers", "HOR"]);
  assert.equal(organization?.name, website?.name);
  assert.equal(organization?.logo?.url, "https://www.houseofretrieversph.org/icon.png");
  assert.deepEqual(organization?.sameAs, [
    "https://www.facebook.com/houseofretrieversph",
    "https://www.instagram.com/houseofretrieversph/",
  ]);
});

test("uses one canonical public homepage", async () => {
  const seo = await loadSeo();

  assert.equal(seo.SITE_URL, "https://www.houseofretrieversph.org");
  assert.equal(seo.HOME_URL, "https://www.houseofretrieversph.org");
});
