"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export function useSeasonalTheme() {
  return useContext(ThemeContext);
}

export default function SeasonalTheme({ children }) {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    let live = true;
    fetch("/api/theme")
      .then((response) => response.ok ? response.json() : { theme: null })
      .then(({ theme: next }) => { if (live) setTheme(next || null); })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme?.logoVariant) root.dataset.seasonalTheme = theme.logoVariant;
    else delete root.dataset.seasonalTheme;
    return () => { delete root.dataset.seasonalTheme; };
  }, [theme]);

  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
}
