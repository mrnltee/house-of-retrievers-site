import { sql } from "./db";
import { cleanSocials } from "./socials.mjs";

const TABLES = new Set(["supporters", "beneficiaries", "photographers"]);

/** The four social fields from a submitted form → { values } or { error }. */
export function socialsFrom(data) {
  const get = (key) => (typeof data.get(key) === "string" ? data.get(key) : "");
  return cleanSocials({ facebook: get("facebook"), tiktok: get("tiktok"), x: get("x"), threads: get("threads") });
}

/** Saves a brand's or beneficiary's Facebook, TikTok, X and Threads links. */
export function saveSocials(table, id, values) {
  if (!TABLES.has(table)) throw new Error("Unknown table");
  return sql(`UPDATE ${table} SET facebook=$2, tiktok=$3, x_profile=$4, threads=$5 WHERE id=$1`, [id, values.facebook, values.tiktok, values.x, values.threads]);
}
