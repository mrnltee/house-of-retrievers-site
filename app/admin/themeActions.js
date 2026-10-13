"use server";

import { sql } from "../lib/db";
import { actionAdmin, backWith, Forbidden } from "../lib/admin/guard";
import { logActivity } from "../lib/admin/log";
import { validateTheme } from "../lib/seasonalThemes.mjs";

const form = (data, key) => {
  const value = data.get(key);
  return typeof value === "string" ? value : "";
};

export async function saveSeasonalTheme(data) {
  try {
    const admin = await actionAdmin("theme:edit");
    const id = form(data, "id");
    const { value, error } = validateTheme({
      id,
      label: form(data, "label"),
      startsMonth: form(data, "startsMonth"),
      startsDay: form(data, "startsDay"),
      endsMonth: form(data, "endsMonth"),
      endsDay: form(data, "endsDay"),
      logoVariant: form(data, "logoVariant"),
      splashVariant: form(data, "splashVariant"),
      welcomeText: form(data, "welcomeText"),
      enabled: data.get("enabled") === "on",
      priority: form(data, "priority"),
    });
    if (error) await backWith("/theme", "error", error);
    const rows = await sql(
      `UPDATE seasonal_themes SET label=$2, starts_month=$3, starts_day=$4, ends_month=$5, ends_day=$6,
         logo_variant=$7, splash_variant=$8, welcome_text=$9, enabled=$10, priority=$11, updated_by=$12, updated_at=now()
       WHERE id=$1 RETURNING id`,
      [value.id, value.label, value.startsMonth, value.startsDay, value.endsMonth, value.endsDay, value.logoVariant, value.splashVariant, value.welcomeText || null, value.enabled, value.priority, admin.email],
    );
    if (!rows.length) await backWith("/theme", "error", "That seasonal theme no longer exists.");
    await logActivity(admin.email, "theme.save", value.label, { theme: value.id, enabled: value.enabled });
    await backWith("/theme", "ok", `${value.label} theme saved.`);
  } catch (error) {
    if (error instanceof Forbidden) await backWith("/theme", "error", error.message);
    throw error;
  }
}
