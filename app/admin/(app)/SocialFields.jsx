import { SOCIALS } from "../../lib/socials.mjs";

/** Facebook, TikTok, X and Threads: a handle (@name) or the profile link. Shown on the website as links. */
export default function SocialFields({ row }) {
  const value = { facebook: row?.facebook, tiktok: row?.tiktok, x: row?.x_profile, threads: row?.threads };
  return (
    <div className="row-2">
      {SOCIALS.map((s) => (
        <label key={s.key} className="field"><span>{s.label} <small>Optional</small></span><input type="text" name={s.key} placeholder="@name or link" maxLength={300} defaultValue={value[s.key] || ""} /></label>
      ))}
    </div>
  );
}
