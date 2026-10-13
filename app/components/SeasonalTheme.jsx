"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext({ theme: null, ready: false });

export function useSeasonalTheme() {
  return useContext(ThemeContext);
}

export default function SeasonalTheme({ children }) {
  const [state, setState] = useState({ theme: null, ready: false });

  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    const fallback = window.setTimeout(() => {
      controller.abort();
      if (live) setState({ theme: null, ready: true });
    }, 800);
    fetch("/api/theme", { signal: controller.signal })
      .then((response) => response.ok ? response.json() : { theme: null })
      .then(({ theme: next }) => {
        window.clearTimeout(fallback);
        if (live) setState({ theme: next || null, ready: true });
      })
      .catch(() => {
        window.clearTimeout(fallback);
        if (live) setState({ theme: null, ready: true });
      });
    return () => {
      live = false;
      controller.abort();
      window.clearTimeout(fallback);
    };
  }, []);

  return <ThemeContext.Provider value={state}>{children}</ThemeContext.Provider>;
}
