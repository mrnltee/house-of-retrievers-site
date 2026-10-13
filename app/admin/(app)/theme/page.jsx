import { sql } from "../../../lib/db";
import { adminBase, pageAdmin } from "../../../lib/admin/guard";
import { THEME_VARIANTS } from "../../../lib/seasonalThemes.mjs";
import { Flash, NotAllowed, PageHead } from "../ui";
import { saveSeasonalTheme } from "../../themeActions";
import ConfirmButton from "../ConfirmButton";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const variantLabels = { default: "HOR original", halloween: "Halloween", holiday: "Holiday", sparkling: "Sparkling", "new-year": "New Year", valentines: "Valentine's" };
const days = Array.from({ length: 31 }, (_, i) => i + 1);

function ThemeForm({ row }) {
  return (
    <form action={saveSeasonalTheme} className="card form seasonal-theme-form">
      <input type="hidden" name="id" value={row.id} />
      <div className="seasonal-theme-heading">
        <div><h2>{row.label}</h2><p className="small muted">The active theme changes automatically on the scheduled Manila dates.</p></div>
        <label className="check"><input type="checkbox" name="enabled" defaultChecked={row.enabled} /> Enabled</label>
      </div>
      <div className="row-2">
        <label className="field"><span>Theme label</span><input name="label" maxLength={80} required defaultValue={row.label} /></label>
        <label className="field"><span>Priority <small>Higher wins if dates overlap</small></span><input name="priority" type="number" min="0" max="100" defaultValue={row.priority} /></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Starts</span><span className="row-2 compact-fields"><select name="startsMonth" defaultValue={row.starts_month}>{MONTHS.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select><select name="startsDay" defaultValue={row.starts_day}>{days.map((day) => <option key={day}>{day}</option>)}</select></span></label>
        <label className="field"><span>Ends</span><span className="row-2 compact-fields"><select name="endsMonth" defaultValue={row.ends_month}>{MONTHS.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select><select name="endsDay" defaultValue={row.ends_day}>{days.map((day) => <option key={day}>{day}</option>)}</select></span></label>
      </div>
      <div className="row-2">
        <label className="field"><span>Logo treatment</span><select name="logoVariant" defaultValue={row.logo_variant}>{THEME_VARIANTS.map((variant) => <option key={variant} value={variant}>{variantLabels[variant]}</option>)}</select></label>
        <label className="field"><span>Splash treatment</span><select name="splashVariant" defaultValue={row.splash_variant}>{THEME_VARIANTS.map((variant) => <option key={variant} value={variant}>{variantLabels[variant]}</option>)}</select></label>
      </div>
      <label className="field"><span>Welcome message <small>Optional, up to 120 characters</small></span><input name="welcomeText" maxLength={120} defaultValue={row.welcome_text || ""} placeholder="Shown briefly on the seasonal splash" /></label>
      <div className="actions"><ConfirmButton title={`Save the ${row.label} theme?`} echo={[{ name: "label", label: "Theme" }, { name: "startsMonth", label: "Starts" }, { name: "endsMonth", label: "Ends" }]} items={["The seasonal logo and splash treatment will use these settings", "The change is recorded in the activity log"]}>Save theme</ConfirmButton></div>
    </form>
  );
}

export default async function ThemePage({ searchParams }) {
  const params = await searchParams;
  const { allowed } = await pageAdmin("theme:edit");
  if (!allowed) return <NotAllowed />;
  const base = await adminBase();
  let rows = [];
  try { rows = await sql("SELECT * FROM seasonal_themes ORDER BY priority DESC, id"); } catch {}
  return <><PageHead title="Seasonal themes" lead="Set the seasonal logo treatment and splash welcome. The site switches automatically using Manila dates; the official HOR logo artwork stays intact." /><Flash params={params} /><p className="banner note small">The dates repeat every year. Overlapping themes use the higher priority. Turn a theme off when you want the original HOR branding instead.</p><div className="seasonal-theme-list">{rows.map((row) => <ThemeForm key={row.id} row={row} />)}</div><p className="small muted">Back to <a href={`${base}/`}>admin home</a>.</p></>;
}
