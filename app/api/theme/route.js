import { hasDatabase, sql } from "../../lib/db";
import { activeTheme, DEFAULT_THEMES, publicTheme } from "../../lib/seasonalThemes.mjs";

export async function GET() {
  let themes = DEFAULT_THEMES;
  if (hasDatabase()) {
    try {
      const rows = await sql("SELECT id, label, starts_month, starts_day, ends_month, ends_day, logo_variant, splash_variant, welcome_text, enabled, priority FROM seasonal_themes");
      if (rows.length) themes = rows;
    } catch {}
  }
  return Response.json({ theme: publicTheme(activeTheme(themes)) }, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
}
