"use client";

import { useEffect } from "react";

/**
 * Shown instead of a blank "Application error" page when an admin page or a
 * save fails. Nothing was saved when this appears.
 */
export default function AdminError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const tooBig = /body exceeded|413/i.test(String(error?.message || ""));
  return (
    <div className="card alert" role="alert">
      <h2>That didn't save</h2>
      <p>
        {tooBig
          ? "The photo was too large to send. Go back, pick the photo again (it's made smaller automatically now), and save."
          : "Something went wrong on our side. Your last change was not saved."}
      </p>
      {error?.digest && <p className="small muted">Reference: {error.digest}</p>}
      <div className="actions">
        <button type="button" className="btn" onClick={() => reset()}>Try again</button>
        <button type="button" className="btn ghost" onClick={() => window.history.back()}>Go back</button>
      </div>
    </div>
  );
}
