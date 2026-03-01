"use client";

import type { PipelineData } from "@/types";
import { getLevel, masteryToXP } from "@/lib/utils";
import { KT, FONTS, type KTheme } from "@/theme";

interface HeaderProps {
  pipelineData: PipelineData | null;
  onClearPipeline: () => void;
  onStudy: () => void;
  xp?: number;
  theme?: KTheme;
  onToggleTheme?: () => void;
}

export default function Header({
  pipelineData,
  onClearPipeline,
  onStudy,
  xp = 0,
  theme = "light",
  onToggleTheme,
}: HeaderProps) {
  const t = KT[theme];
  const { level, name, progress } = getLevel(xp);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
      `}</style>
      <header
        style={{
          borderBottom: `1px solid ${t.border}`,
          padding: "0 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background:
            theme === "light"
              ? "rgba(248,246,241,0.95)"
              : "rgba(23,22,15,0.95)",
          backdropFilter: "blur(16px) saturate(1.4)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          height: 62,
          boxShadow: `0 1px 0 ${t.border}, 0 4px 24px rgba(0,0,0,0.04)`,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 17,
              fontWeight: 900,
              color: "#fff",
              fontFamily: FONTS.display,
              boxShadow: `0 3px 10px ${t.accentGlow}`,
              letterSpacing: -0.5,
            }}
          >
            K
          </div>
          <div>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: -0.4,
                color: t.text,
                lineHeight: 1,
                fontFamily: FONTS.display,
              }}
            >
              Kaksha
            </div>
            <div
              style={{
                fontSize: 9,
                color: t.textFaint,
                letterSpacing: 1.5,
                fontWeight: 700,
                fontFamily: FONTS.body,
                textTransform: "uppercase",
              }}
            >
              Knowledge Engine
            </div>
          </div>
        </div>

        {/* Center XP bar */}
        {pipelineData && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                background: t.surfaceAlt,
                borderRadius: 40,
                padding: "5px 14px 5px 6px",
                border: `1px solid ${t.border}`,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accentAlt})`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  color: "#fff",
                  fontWeight: 800,
                  fontFamily: FONTS.display,
                }}
              >
                {level}
              </div>
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: t.text,
                    fontFamily: FONTS.body,
                  }}
                >
                  {name}
                </div>
                <div
                  style={{
                    width: 72,
                    height: 3,
                    background: t.border,
                    borderRadius: 3,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      width: `${progress}%`,
                      height: "100%",
                      background: `linear-gradient(90deg, ${t.accent}, ${t.accentAlt})`,
                      borderRadius: 3,
                      transition: "width 0.6s",
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: t.textMuted,
                  fontWeight: 600,
                  fontFamily: FONTS.body,
                }}
              >
                {xp} XP
              </span>
            </div>
          </div>
        )}

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {pipelineData ? (
            <>
              <div style={{ display: "flex", gap: 6 }}>
                {(
                  [
                    [
                      "📦",
                      pipelineData.pipeline_summary?.total_chunks ??
                        pipelineData.chunks.length,
                      "chunks",
                    ],
                    [
                      "🗂",
                      pipelineData.pipeline_summary?.total_clusters ??
                        pipelineData.clusters.length,
                      "clusters",
                    ],
                    [
                      "🧠",
                      pipelineData.pipeline_summary?.total_topics ??
                        pipelineData.topics.length,
                      "topics",
                    ],
                  ] as [string, number, string][]
                ).map(([icon, val, label]) => (
                  <div
                    key={label}
                    style={{
                      padding: "4px 9px",
                      background: t.surfaceAlt,
                      borderRadius: 8,
                      fontSize: 11,
                      color: t.textMuted,
                      border: `1px solid ${t.border}`,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontWeight: 500,
                      fontFamily: FONTS.body,
                    }}
                  >
                    <span>{icon}</span>
                    <span style={{ fontWeight: 800, color: t.text }}>
                      {val}
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={onClearPipeline}
                style={{
                  padding: "6px 13px",
                  background: "transparent",
                  border: `1px solid ${t.border}`,
                  borderRadius: 8,
                  color: t.textMuted,
                  cursor: "pointer",
                  fontSize: 12,
                  fontFamily: FONTS.body,
                  fontWeight: 600,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    t.accent;
                  (e.currentTarget as HTMLButtonElement).style.color = t.accent;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.borderColor =
                    t.border;
                  (e.currentTarget as HTMLButtonElement).style.color =
                    t.textMuted;
                }}
              >
                ← Library
              </button>

              <button
                onClick={onStudy}
                style={{
                  padding: "7px 18px",
                  background: `linear-gradient(135deg, ${t.accent}, ${t.accentAlt})`,
                  border: "none",
                  borderRadius: 9,
                  color: "#fff",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: FONTS.body,
                  boxShadow: `0 3px 12px ${t.accentGlow}`,
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform =
                    "translateY(-1px)";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    `0 6px 18px ${t.accentGlow}`;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.transform = "";
                  (e.currentTarget as HTMLButtonElement).style.boxShadow =
                    `0 3px 12px ${t.accentGlow}`;
                }}
              >
                ▶ Study Now
              </button>
            </>
          ) : (
            <span
              style={{
                fontSize: 12,
                color: t.textFaint,
                fontFamily: FONTS.body,
              }}
            >
              Upload a PDF to get started
            </span>
          )}

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: t.surfaceAlt,
                border: `1px solid ${t.border}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                color: t.textMuted,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = t.surfaceHover)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = t.surfaceAlt)
              }
            >
              {theme === "dark" ? "☀" : "◑"}
            </button>
          )}
        </div>
      </header>
    </>
  );
}
