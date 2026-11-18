"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fuzzyMatch } from "../../../../../lib/fuzzy.mjs";
import { TRACKER_SORTS } from "../../../../../lib/eventBrands.mjs";

const rowsOf = () => [...document.querySelectorAll("#tracker-rows > tr[data-row]")];

/**
 * The Brand tracker's toolbar: forgiving search, reply filter (with counts) and sort.
 * Search and filter hide rows in place; sorting is done by the server and remembered.
 */
// Filter labels; the Guest tracker passes its own ("Coming", "Can't make it").
const BRAND_LABELS = { yes: "Said yes", no: "Said no", waiting: "No reply yet", unsent: "No invite sent" };

export default function TrackerTools({ counts, sort, publicNote = "", labels = BRAND_LABELS, placeholder = "Search brands…", searchTitle = "Searches brand, contact, email and letter", noun = "brands", sorts = TRACKER_SORTS, groups = null, groupLabel = "All groups" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  // The Guest tracker's group dropdown (owner, 18 Nov 2026): [[key, label, count]]; rows carry data-group.
  const [group, setGroup] = useState("");
  const [shown, setShown] = useState(counts.invited);

  useEffect(() => {
    let n = 0;
    rowsOf().forEach((tr) => {
      const show = (!reply || (reply === "unsent" ? tr.dataset.sent === "no" : tr.dataset.reply === reply)) && (!group || (tr.dataset.group || "").split(" ").includes(group)) && fuzzyMatch(q, tr.dataset.search);
      tr.hidden = !show;
      if (show) n++;
    });
    setShown(n);
    document.dispatchEvent(new Event("tracker:filtered"));
  }, [q, reply, group]);

  function pickSort(value) {
    document.cookie = `tracker_sort=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const filters = [["", "All", counts.invited, ""], ["yes", labels.yes, counts.yes, "good"], ["no", labels.no, counts.no, "alert"], ["waiting", labels.waiting, counts.waiting, ""], ["unsent", labels.unsent, counts.unsent, ""]];
  return (
    <div className="tracker-tools">
      <label className="tracker-search">
        <span className="sr-only">Search the tracker</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} title={searchTitle} autoComplete="off" />
      </label>
      <div className="tracker-filters" role="group" aria-label="Show by reply or invite">
        {filters.map(([key, label, n, tone]) => (
          <button key={key || "all"} type="button" data-confirm="not-needed-read-only" className={`tracker-filter ${tone}`.trim()} aria-pressed={reply === key} onClick={() => setReply(key)} title={key === "yes" ? publicNote : undefined}>
            {label} <span className="tracker-count">{n}</span>
          </button>
        ))}
      </div>
      {groups && groups.length > 1 && (
        <label className="tracker-group">
          <span className="sr-only">Show one group</span>
          <select value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="">{groupLabel}</option>
            {groups.map(([key, label, n]) => <option key={key} value={key}>{label} · {n}</option>)}
          </select>
        </label>
      )}
      <label className="tracker-sort">
        <span className="sr-only">Sort</span>
        <select value={sort} onChange={(e) => pickSort(e.target.value)}>
          {sorts.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <p className="small muted tracker-shown" aria-live="polite">{q || reply || group ? (shown ? `Showing ${shown} of ${counts.invited}. ` : `No ${noun} match. Try fewer or different words. `) : ""}{publicNote}</p>
    </div>
  );
}
