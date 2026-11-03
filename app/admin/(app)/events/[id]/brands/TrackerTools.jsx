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
export default function TrackerTools({ counts, sort, publicNote = "" }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [reply, setReply] = useState("");
  const [shown, setShown] = useState(counts.invited);

  useEffect(() => {
    let n = 0;
    rowsOf().forEach((tr) => {
      const show = (!reply || (reply === "unsent" ? tr.dataset.sent === "no" : tr.dataset.reply === reply)) && fuzzyMatch(q, tr.dataset.search);
      tr.hidden = !show;
      if (show) n++;
    });
    setShown(n);
    document.dispatchEvent(new Event("tracker:filtered"));
  }, [q, reply]);

  function pickSort(value) {
    document.cookie = `tracker_sort=${value}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  const filters = [["", "All", counts.invited, ""], ["yes", "Said yes", counts.yes, "good"], ["no", "Said no", counts.no, "alert"], ["waiting", "No reply yet", counts.waiting, ""], ["unsent", "No invite sent", counts.unsent, ""]];
  return (
    <div className="tracker-tools">
      <label className="tracker-search">
        <span className="sr-only">Search the tracker</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search brand, contact, email, letter…" autoComplete="off" />
      </label>
      <div className="tracker-filters" role="group" aria-label="Show by reply or invite">
        {filters.map(([key, label, n, tone]) => (
          <button key={key || "all"} type="button" data-confirm="not-needed-read-only" className={`tracker-filter ${tone}`.trim()} aria-pressed={reply === key} onClick={() => setReply(key)} title={key === "yes" ? publicNote : undefined}>
            {label} <span className="tracker-count">{n}</span>
          </button>
        ))}
      </div>
      <label className="tracker-sort">
        <span className="sr-only">Sort</span>
        <select value={sort} onChange={(e) => pickSort(e.target.value)}>
          {TRACKER_SORTS.map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
      </label>
      <p className="small muted tracker-shown" aria-live="polite">{q || reply ? (shown ? `Showing ${shown} of ${counts.invited}. ` : "No brands match. Try fewer or different words. ") : ""}{publicNote}</p>
    </div>
  );
}
