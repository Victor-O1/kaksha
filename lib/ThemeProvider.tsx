"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { ThemeMode, ThemeName, Theme, getTheme } from "./themes";

interface ThemeContextType {
  mode: ThemeMode;
  themeName: ThemeName;
  theme: Theme;
  setMode: (mode: ThemeMode) => void;
  setThemeName: (name: ThemeName) => void;
  toggleMode: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [themeName, setThemeNameState] = useState<ThemeName>("default");
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedMode = localStorage.getItem("theme-mode") as ThemeMode | null;
    const savedTheme = localStorage.getItem("theme-name") as ThemeName | null;

    if (savedMode) setModeState(savedMode);
    if (savedTheme) setThemeNameState(savedTheme);

    setMounted(true);
  }, []);

  // Apply theme to document
  useEffect(() => {
    if (!mounted) return;

    const currentTheme = getTheme(mode, themeName);
    const root = document.documentElement;

    // Apply all CSS variables
    Object.entries(currentTheme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--theme-${key}`, value);
    });

    // Add data attribute for potential CSS selectors
    root.setAttribute("data-theme-mode", mode);
    root.setAttribute("data-theme-name", themeName);

    // Update meta theme-color for mobile browsers
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", currentTheme.colors.background);
    }
  }, [mode, themeName, mounted]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    localStorage.setItem("theme-mode", newMode);
  };

  const setThemeName = (newName: ThemeName) => {
    setThemeNameState(newName);
    localStorage.setItem("theme-name", newName);
  };

  const toggleMode = () => {
    setMode(mode === "light" ? "dark" : "light");
  };

  const theme = getTheme(mode, themeName);

  // Prevent flash of unstyled content
  if (!mounted) {
    return null;
  }

  return (
    <ThemeContext.Provider
      value={{
        mode,
        themeName,
        theme,
        setMode,
        setThemeName,
        toggleMode,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
