// ─── Kaksha shared design tokens ──────────────────────────────────────────────
// Import this in every component: import { KT } from "@/theme"
// Usage: const t = KT.light  (or pass theme prop and do KT[theme])

export type KTheme = "light" | "dark";

export const KT = {
  light: {
    bg: "#F8F6F1",
    surface: "#FFFFFF",
    surfaceAlt: "#F2EFE9",
    surfaceHover: "#EDE8E0",
    border: "#E4DDD2",
    borderStrong: "#C8BFB4",
    text: "#1C1814",
    textMuted: "#7A6E65",
    textFaint: "#B0A89E",
    accent: "#C4622D",
    accentHover: "#A84F22",
    accentAlt: "#2D6AC4",
    accentAltHover: "#2558A8",
    accentGlow: "rgba(196,98,45,0.18)",
    accentAltGlow: "rgba(45,106,196,0.15)",
    pill: "#EDE8E1",
    pillText: "#5C5249",
    shadow: "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.05)",
    shadowMd: "0 4px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)",
    shadowLg: "0 12px 48px rgba(0,0,0,0.12)",
    inputBg: "#F8F6F1",
    inputBorder: "#D8D1C8",
    success: "#2A7A4B",
    successBg: "#F0FBF4",
    successBorder: "#A8D5B9",
    error: "#B43030",
    errorBg: "#FEF2F2",
    errorBorder: "#FCA5A5",
    warn: "#92620A",
    warnBg: "#FEFCE8",
    warnBorder: "#FDE68A",
  },
  dark: {
    bg: "#0E0D0B",
    surface: "#17160F",
    surfaceAlt: "#201F18",
    surfaceHover: "#2A2920",
    border: "#2C2A22",
    borderStrong: "#3E3B30",
    text: "#F0ECDF",
    textMuted: "#8A8275",
    textFaint: "#4A4840",
    accent: "#E07A42",
    accentHover: "#F08A52",
    accentAlt: "#4A8AE8",
    accentAltHover: "#5A9AF8",
    accentGlow: "rgba(224,122,66,0.2)",
    accentAltGlow: "rgba(74,138,232,0.18)",
    pill: "#201F18",
    pillText: "#9A9288",
    shadow: "0 1px 3px rgba(0,0,0,0.4), 0 4px 16px rgba(0,0,0,0.25)",
    shadowMd: "0 4px 20px rgba(0,0,0,0.35), 0 1px 4px rgba(0,0,0,0.25)",
    shadowLg: "0 12px 48px rgba(0,0,0,0.5)",
    inputBg: "#0E0D0B",
    inputBorder: "#2C2A22",
    success: "#34A062",
    successBg: "#0A1F12",
    successBorder: "#1A5C32",
    error: "#E05050",
    errorBg: "#1F0A0A",
    errorBorder: "#5C1A1A",
    warn: "#D4880A",
    warnBg: "#1A1400",
    warnBorder: "#5C3E00",
  },
} as const;

// Cluster colors – consistent warm palette
export const CLUSTER_COLORS = [
  "#C4622D", // terracotta
  "#2D6AC4", // cobalt
  "#2A7A4B", // forest
  "#7C3D8A", // plum
  "#B8860B", // dark gold
  "#1E7A7A", // teal
  "#9B3030", // burgundy
  "#3D6E9B", // steel
];

export function clusterColor(id: number | null | undefined): string {
  if (id === null || id === undefined) return "#8A8275";
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
}

export const FONTS = {
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  body: "'DM Sans', system-ui, -apple-system, sans-serif",
  mono: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
};
