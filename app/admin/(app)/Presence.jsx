"use client";

import { useEffect } from "react";
import { stillHere } from "../presenceActions";

/** While the admin is open and visible, tells the server every 2 minutes. */
export default function Presence() {
  useEffect(() => {
    const beat = () => { if (document.visibilityState === "visible") stillHere().catch(() => {}); };
    const timer = setInterval(beat, 2 * 60 * 1000);
    document.addEventListener("visibilitychange", beat);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", beat); };
  }, []);
  return null;
}
