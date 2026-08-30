"use client";

import * as React from "react";

export type ThemeMode = "auto" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function resolveMode(mode: ThemeMode): ResolvedTheme {
  if (mode === "auto") {
    if (typeof window === "undefined") return "light";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return mode;
}

export function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  const [mode, setModeState] = React.useState<ThemeMode>("auto");
  const [resolved, setResolved] = React.useState<ResolvedTheme>("light");

  React.useEffect(() => {
    const stored = localStorage.getItem("theme-mode") as ThemeMode | null;
    const initial: ThemeMode =
      stored === "light" || stored === "dark" || stored === "auto"
        ? stored
        : "auto";
    setModeState(initial);
    setResolved(resolveMode(initial));
  }, []);

  React.useEffect(() => {
    const r = resolveMode(mode);
    setResolved(r);
    document.documentElement.setAttribute("data-theme", r);
    document.documentElement.dataset.themeMode = mode;
    localStorage.setItem("theme-mode", mode);
    if (mode !== "auto") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const next = mql.matches ? "dark" : "light";
      setResolved(next);
      document.documentElement.setAttribute("data-theme", next);
    };
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [mode]);

  const value = React.useMemo(
    () => ({
      mode,
      resolved,
      setMode: (m: ThemeMode) => setModeState(m),
    }),
    [mode, resolved],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
