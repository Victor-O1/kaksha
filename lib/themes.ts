// lib/themes.ts

export type ThemeMode = "light" | "dark";
export type ThemeName =
  | "default"
  | "ocean"
  | "forest"
  | "sunset"
  | "midnight"
  | "lavender";

export interface Theme {
  name: ThemeName;
  label: string;
  colors: {
    // Backgrounds
    background: string;
    backgroundSecondary: string;
    backgroundTertiary: string;

    // Surfaces
    surface: string;
    surfaceHover: string;
    surfaceActive: string;

    // Borders
    border: string;
    borderHover: string;

    // Text
    text: string;
    textSecondary: string;
    textTertiary: string;

    // Primary accent
    primary: string;
    primaryHover: string;
    primaryText: string;

    // Secondary accent
    secondary: string;
    secondaryHover: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // Special
    gradient: string;
    shadow: string;
  };
}

export const lightThemes: Record<ThemeName, Theme> = {
  default: {
    name: "default",
    label: "Light",
    colors: {
      background: "#ffffff",
      backgroundSecondary: "#f8f9fa",
      backgroundTertiary: "#f1f3f5",

      surface: "#ffffff",
      surfaceHover: "#f8f9fa",
      surfaceActive: "#e9ecef",

      border: "#dee2e6",
      borderHover: "#adb5bd",

      text: "#212529",
      textSecondary: "#495057",
      textTertiary: "#868e96",

      primary: "#3b82f6",
      primaryHover: "#2563eb",
      primaryText: "#ffffff",

      secondary: "#8b5cf6",
      secondaryHover: "#7c3aed",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      shadow: "rgba(0, 0, 0, 0.1)",
    },
  },
  ocean: {
    name: "ocean",
    label: "Ocean",
    colors: {
      background: "#f0f9ff",
      backgroundSecondary: "#e0f2fe",
      backgroundTertiary: "#bae6fd",

      surface: "#ffffff",
      surfaceHover: "#f0f9ff",
      surfaceActive: "#e0f2fe",

      border: "#7dd3fc",
      borderHover: "#38bdf8",

      text: "#0c4a6e",
      textSecondary: "#0369a1",
      textTertiary: "#0284c7",

      primary: "#0284c7",
      primaryHover: "#0369a1",
      primaryText: "#ffffff",

      secondary: "#06b6d4",
      secondaryHover: "#0891b2",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
      shadow: "rgba(2, 132, 199, 0.15)",
    },
  },
  forest: {
    name: "forest",
    label: "Forest",
    colors: {
      background: "#f0fdf4",
      backgroundSecondary: "#dcfce7",
      backgroundTertiary: "#bbf7d0",

      surface: "#ffffff",
      surfaceHover: "#f0fdf4",
      surfaceActive: "#dcfce7",

      border: "#86efac",
      borderHover: "#4ade80",

      text: "#14532d",
      textSecondary: "#15803d",
      textTertiary: "#16a34a",

      primary: "#16a34a",
      primaryHover: "#15803d",
      primaryText: "#ffffff",

      secondary: "#10b981",
      secondaryHover: "#059669",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #16a34a 0%, #10b981 100%)",
      shadow: "rgba(22, 163, 74, 0.15)",
    },
  },
  sunset: {
    name: "sunset",
    label: "Sunset",
    colors: {
      background: "#fff7ed",
      backgroundSecondary: "#ffedd5",
      backgroundTertiary: "#fed7aa",

      surface: "#ffffff",
      surfaceHover: "#fff7ed",
      surfaceActive: "#ffedd5",

      border: "#fdba74",
      borderHover: "#fb923c",

      text: "#7c2d12",
      textSecondary: "#9a3412",
      textTertiary: "#c2410c",

      primary: "#ea580c",
      primaryHover: "#c2410c",
      primaryText: "#ffffff",

      secondary: "#f59e0b",
      secondaryHover: "#d97706",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)",
      shadow: "rgba(234, 88, 12, 0.15)",
    },
  },
  lavender: {
    name: "lavender",
    label: "Lavender",
    colors: {
      background: "#faf5ff",
      backgroundSecondary: "#f3e8ff",
      backgroundTertiary: "#e9d5ff",

      surface: "#ffffff",
      surfaceHover: "#faf5ff",
      surfaceActive: "#f3e8ff",

      border: "#d8b4fe",
      borderHover: "#c084fc",

      text: "#581c87",
      textSecondary: "#6b21a8",
      textTertiary: "#7e22ce",

      primary: "#7c3aed",
      primaryHover: "#6b21a8",
      primaryText: "#ffffff",

      secondary: "#a855f7",
      secondaryHover: "#9333ea",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)",
      shadow: "rgba(124, 58, 237, 0.15)",
    },
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    colors: {
      background: "#f8fafc",
      backgroundSecondary: "#f1f5f9",
      backgroundTertiary: "#e2e8f0",

      surface: "#ffffff",
      surfaceHover: "#f8fafc",
      surfaceActive: "#f1f5f9",

      border: "#cbd5e1",
      borderHover: "#94a3b8",

      text: "#0f172a",
      textSecondary: "#334155",
      textTertiary: "#475569",

      primary: "#0f172a",
      primaryHover: "#1e293b",
      primaryText: "#ffffff",

      secondary: "#475569",
      secondaryHover: "#334155",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #0f172a 0%, #475569 100%)",
      shadow: "rgba(15, 23, 42, 0.15)",
    },
  },
};

export const darkThemes: Record<ThemeName, Theme> = {
  default: {
    name: "default",
    label: "Dark",
    colors: {
      background: "#0a0a0a",
      backgroundSecondary: "#111111",
      backgroundTertiary: "#1a1a1a",

      surface: "rgba(255, 255, 255, 0.03)",
      surfaceHover: "rgba(255, 255, 255, 0.06)",
      surfaceActive: "rgba(255, 255, 255, 0.1)",

      border: "rgba(255, 255, 255, 0.08)",
      borderHover: "rgba(255, 255, 255, 0.2)",

      text: "#ffffff",
      textSecondary: "#a1a1aa",
      textTertiary: "#71717a",

      primary: "#3b82f6",
      primaryHover: "#60a5fa",
      primaryText: "#ffffff",

      secondary: "#8b5cf6",
      secondaryHover: "#a78bfa",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
      shadow: "rgba(0, 0, 0, 0.5)",
    },
  },
  ocean: {
    name: "ocean",
    label: "Ocean Dark",
    colors: {
      background: "#0c1e2e",
      backgroundSecondary: "#0e2538",
      backgroundTertiary: "#103142",

      surface: "rgba(14, 165, 233, 0.05)",
      surfaceHover: "rgba(14, 165, 233, 0.1)",
      surfaceActive: "rgba(14, 165, 233, 0.15)",

      border: "rgba(14, 165, 233, 0.2)",
      borderHover: "rgba(14, 165, 233, 0.4)",

      text: "#e0f2fe",
      textSecondary: "#7dd3fc",
      textTertiary: "#38bdf8",

      primary: "#0ea5e9",
      primaryHover: "#38bdf8",
      primaryText: "#ffffff",

      secondary: "#06b6d4",
      secondaryHover: "#22d3ee",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%)",
      shadow: "rgba(14, 165, 233, 0.3)",
    },
  },
  forest: {
    name: "forest",
    label: "Forest Dark",
    colors: {
      background: "#0a1f14",
      backgroundSecondary: "#0d2418",
      backgroundTertiary: "#112e1f",

      surface: "rgba(16, 185, 129, 0.05)",
      surfaceHover: "rgba(16, 185, 129, 0.1)",
      surfaceActive: "rgba(16, 185, 129, 0.15)",

      border: "rgba(16, 185, 129, 0.2)",
      borderHover: "rgba(16, 185, 129, 0.4)",

      text: "#d1fae5",
      textSecondary: "#6ee7b7",
      textTertiary: "#34d399",

      primary: "#10b981",
      primaryHover: "#34d399",
      primaryText: "#ffffff",

      secondary: "#059669",
      secondaryHover: "#10b981",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
      shadow: "rgba(16, 185, 129, 0.3)",
    },
  },
  sunset: {
    name: "sunset",
    label: "Sunset Dark",
    colors: {
      background: "#1f1108",
      backgroundSecondary: "#2a180d",
      backgroundTertiary: "#3d2412",

      surface: "rgba(249, 115, 22, 0.05)",
      surfaceHover: "rgba(249, 115, 22, 0.1)",
      surfaceActive: "rgba(249, 115, 22, 0.15)",

      border: "rgba(249, 115, 22, 0.2)",
      borderHover: "rgba(249, 115, 22, 0.4)",

      text: "#ffedd5",
      textSecondary: "#fdba74",
      textTertiary: "#fb923c",

      primary: "#f97316",
      primaryHover: "#fb923c",
      primaryText: "#ffffff",

      secondary: "#ea580c",
      secondaryHover: "#f97316",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
      shadow: "rgba(249, 115, 22, 0.3)",
    },
  },
  lavender: {
    name: "lavender",
    label: "Lavender Dark",
    colors: {
      background: "#1a0d2e",
      backgroundSecondary: "#231339",
      backgroundTertiary: "#2d1b47",

      surface: "rgba(168, 85, 247, 0.05)",
      surfaceHover: "rgba(168, 85, 247, 0.1)",
      surfaceActive: "rgba(168, 85, 247, 0.15)",

      border: "rgba(168, 85, 247, 0.2)",
      borderHover: "rgba(168, 85, 247, 0.4)",

      text: "#f3e8ff",
      textSecondary: "#d8b4fe",
      textTertiary: "#c084fc",

      primary: "#a855f7",
      primaryHover: "#c084fc",
      primaryText: "#ffffff",

      secondary: "#7c3aed",
      secondaryHover: "#a855f7",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)",
      shadow: "rgba(168, 85, 247, 0.3)",
    },
  },
  midnight: {
    name: "midnight",
    label: "Midnight",
    colors: {
      background: "#0f172a",
      backgroundSecondary: "#1e293b",
      backgroundTertiary: "#334155",

      surface: "rgba(71, 85, 105, 0.1)",
      surfaceHover: "rgba(71, 85, 105, 0.2)",
      surfaceActive: "rgba(71, 85, 105, 0.3)",

      border: "rgba(71, 85, 105, 0.3)",
      borderHover: "rgba(71, 85, 105, 0.5)",

      text: "#f1f5f9",
      textSecondary: "#cbd5e1",
      textTertiary: "#94a3b8",

      primary: "#3b82f6",
      primaryHover: "#60a5fa",
      primaryText: "#ffffff",

      secondary: "#64748b",
      secondaryHover: "#94a3b8",

      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      info: "#06b6d4",

      gradient: "linear-gradient(135deg, #1e293b 0%, #334155 100%)",
      shadow: "rgba(15, 23, 42, 0.5)",
    },
  },
};

export function getTheme(mode: ThemeMode, name: ThemeName): Theme {
  return mode === "light" ? lightThemes[name] : darkThemes[name];
}
