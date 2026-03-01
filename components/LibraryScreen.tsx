"use client";

import type { LibraryEntry } from "@/types";
import { getClusterColor, masteryToXP, getLevel } from "@/lib/utils";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

interface LibraryScreenProps {
  library: LibraryEntry[];
  libraryLoading: boolean;
  onLoadPdf: (sourcePdf: string) => void;
  onStudy: (sourcePdf: string) => void;
  onUpload: (file: File) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  theme?: KTheme;
}

function MasteryRing({ pct, accent }: { pct: number; accent: string }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={48} height={48} style={{ flexShrink: 0 }}>
      <circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        stroke={`${accent}20`}
        strokeWidth={3.5}
      />
      <circle
        cx={24}
        cy={24}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={3.5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 24 24)"
        style={{ transition: "stroke-dasharray 0.8s" }}
      />
      <text
        x={24}
        y={28}
        textAnchor="middle"
        fontSize={9}
        fontWeight={800}
        fill={accent}
        fontFamily="system-ui"
      >
        {pct}%
      </text>
    </svg>
  );
}

export default function LibraryScreen({
  library,
  libraryLoading,
  onLoadPdf,
  onStudy,
  onUpload,
  fileInputRef,
  theme = "light",
}: LibraryScreenProps) {
  const t = KT[theme];

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) onUpload(file);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes libSpin { to { transform: rotate(360deg); } }
      `}</style>

      <div
        style={{
          flex: 1,
          padding: "40px 44px",
          overflowY: "auto",
          background: t.bg,
          minHeight: 0,
        }}
      >
        {/* Hero */}
        <div style={{ marginBottom: 36 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: `${t.accent}10`,
              border: `1px solid ${t.accent}25`,
              borderRadius: 40,
              padding: "5px 14px",
              marginBottom: 18,
            }}
          >
            <span style={{ fontSize: 13 }}>📚</span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: t.accent,
                letterSpacing: 1,
                fontFamily: FONTS.body,
                textTransform: "uppercase",
              }}
            >
              Adaptive Learning Engine
            </span>
          </div>
          <h1
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: t.text,
              margin: 0,
              lineHeight: 1.08,
              letterSpacing: -1.5,
              fontFamily: FONTS.display,
            }}
          >
            Your Knowledge
            <br />
            <span
              style={{
                background: `linear-gradient(135deg, ${t.accent} 0%, ${t.accentAlt} 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Library
            </span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: t.textMuted,
              marginTop: 10,
              fontFamily: FONTS.body,
              fontWeight: 400,
            }}
          >
            {libraryLoading
              ? "Loading your PDFs..."
              : library.length === 0
                ? "Upload your first PDF to begin"
                : `${library.length} PDF${library.length > 1 ? "s" : ""} ready to explore`}
          </p>
        </div>

        {/* Upload button */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "11px 22px",
              background: `linear-gradient(135deg, ${t.accent}, ${t.accentAlt})`,
              border: "none",
              borderRadius: 11,
              color: "#fff",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 700,
              fontFamily: FONTS.body,
              display: "flex",
              alignItems: "center",
              gap: 8,
              boxShadow: `0 4px 18px ${t.accentGlow}`,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = "translateY(-2px)")
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
          >
            <span style={{ fontSize: 16, fontWeight: 300 }}>+</span> Upload New
            PDF
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onUpload(f);
            }}
          />
        </div>

        {/* Loading */}
        {libraryLoading && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              paddingTop: 80,
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                border: `3px solid ${t.border}`,
                borderTop: `3px solid ${t.accent}`,
                borderRadius: "50%",
                animation: "libSpin 0.9s linear infinite",
              }}
            />
          </div>
        )}

        {/* Empty drop zone */}
        {!libraryLoading && library.length === 0 && (
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${t.borderStrong}`,
              borderRadius: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              gap: 14,
              minHeight: 360,
              background: t.surfaceAlt,
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor = t.accent;
              (e.currentTarget as HTMLDivElement).style.background =
                `${t.accent}06`;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.borderColor =
                t.borderStrong;
              (e.currentTarget as HTMLDivElement).style.background =
                t.surfaceAlt;
            }}
          >
            <div style={{ fontSize: 52 }}>📄</div>
            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: t.text,
                fontFamily: FONTS.display,
              }}
            >
              Drop a PDF here
            </div>
            <div
              style={{
                fontSize: 13,
                color: t.textMuted,
                fontFamily: FONTS.body,
              }}
            >
              or click to browse
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                justifyContent: "center",
                maxWidth: 400,
              }}
            >
              {[
                "Chunk",
                "Embed",
                "Cluster",
                "Label Topics",
                "Build DAG",
                "Generate Concepts",
              ].map((s, i) => (
                <span
                  key={i}
                  style={{
                    fontSize: 11,
                    padding: "4px 12px",
                    border: `1px solid ${t.accent}30`,
                    borderRadius: 20,
                    color: t.accent,
                    background: `${t.accent}08`,
                    fontWeight: 600,
                    fontFamily: FONTS.body,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* PDF Grid */}
        {!libraryLoading && library.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
              gap: 18,
            }}
          >
            {library.map((entry) => {
              const m = entry.mastery;
              const xp = masteryToXP(m);
              const { level, name: levelName } = getLevel(xp);
              const pct = Math.round(m.overall_score * 100);
              const masteredPct =
                m.total_concepts > 0
                  ? Math.round((m.mastered / m.total_concepts) * 100)
                  : 0;
              const levelColor =
                pct >= 70 ? t.success : pct >= 40 ? t.warn : t.accent;
              const hasProgress = m.sessions > 0;

              return (
                <div
                  key={entry.source_pdf}
                  style={{
                    background: t.surface,
                    border: `1px solid ${t.border}`,
                    borderRadius: 18,
                    padding: "22px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    boxShadow: t.shadow,
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      t.shadowMd;
                    (e.currentTarget as HTMLDivElement).style.transform =
                      "translateY(-2px)";
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      t.borderStrong;
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      t.shadow;
                    (e.currentTarget as HTMLDivElement).style.transform = "";
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      t.border;
                  }}
                >
                  {/* Top row */}
                  <div
                    style={{
                      display: "flex",
                      gap: 12,
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: `linear-gradient(135deg, ${t.accent}18, ${t.accentAlt}18)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                        border: `1px solid ${t.border}`,
                      }}
                    >
                      📄
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: t.text,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontFamily: FONTS.display,
                        }}
                      >
                        {entry.source_pdf}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: t.textMuted,
                          marginTop: 3,
                          fontFamily: FONTS.body,
                          fontWeight: 500,
                        }}
                      >
                        {entry.chunk_count} chunks · {entry.cluster_count}{" "}
                        clusters · {entry.concept_count} concepts
                      </div>
                    </div>
                    <div
                      style={{
                        padding: "3px 9px",
                        borderRadius: 20,
                        background: `${t.accent}12`,
                        border: `1px solid ${t.accent}25`,
                        fontSize: 10,
                        fontWeight: 800,
                        color: t.accent,
                        whiteSpace: "nowrap",
                        fontFamily: FONTS.body,
                      }}
                    >
                      Lv.{level} {levelName}
                    </div>
                  </div>

                  {/* Cluster pills */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {entry.clusters.slice(0, 5).map((cl) => {
                      const c = clusterColor(cl.cluster_id);
                      return (
                        <span
                          key={cl.cluster_id}
                          style={{
                            fontSize: 10,
                            padding: "3px 9px",
                            background: `${c}10`,
                            border: `1px solid ${c}28`,
                            color: c,
                            borderRadius: 20,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                            fontFamily: FONTS.body,
                          }}
                        >
                          {cl.label || `C${cl.cluster_id}`}
                          {cl.concept_count > 0 && (
                            <span style={{ opacity: 0.55 }}>
                              {" "}
                              ·{cl.concept_count}
                            </span>
                          )}
                        </span>
                      );
                    })}
                    {entry.clusters.length > 5 && (
                      <span
                        style={{
                          fontSize: 10,
                          color: t.textFaint,
                          padding: "3px 9px",
                          fontFamily: FONTS.body,
                        }}
                      >
                        +{entry.clusters.length - 5} more
                      </span>
                    )}
                  </div>

                  {/* Mastery */}
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <MasteryRing pct={masteredPct} accent={levelColor} />
                    <div style={{ flex: 1 }}>
                      {hasProgress ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              marginBottom: 5,
                            }}
                          >
                            <span
                              style={{
                                fontSize: 11,
                                color: t.textMuted,
                                fontWeight: 600,
                                fontFamily: FONTS.body,
                              }}
                            >
                              Mastery Progress
                            </span>
                            <span
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: levelColor,
                                fontFamily: FONTS.body,
                              }}
                            >
                              {m.mastered}/{m.total_concepts} concepts
                            </span>
                          </div>
                          <div
                            style={{
                              height: 5,
                              background: t.surfaceAlt,
                              borderRadius: 5,
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${masteredPct}%`,
                                height: "100%",
                                background: `linear-gradient(90deg, ${levelColor}, ${levelColor}99)`,
                                borderRadius: 5,
                                transition: "width 0.7s",
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: t.textFaint,
                              marginTop: 3,
                              fontFamily: FONTS.body,
                            }}
                          >
                            {m.sessions} session{m.sessions !== 1 ? "s" : ""} ·{" "}
                            {xp} XP
                          </div>
                        </>
                      ) : (
                        <div
                          style={{
                            fontSize: 12,
                            color: t.textMuted,
                            background: t.surfaceAlt,
                            borderRadius: 8,
                            padding: "8px 12px",
                            textAlign: "center",
                            fontFamily: FONTS.body,
                          }}
                        >
                          🎯 No sessions yet — start learning!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => onLoadPdf(entry.source_pdf)}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        background: t.surfaceAlt,
                        border: `1px solid ${t.border}`,
                        borderRadius: 10,
                        color: t.textMuted,
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: FONTS.body,
                        fontWeight: 600,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = t.accent;
                        (e.currentTarget as HTMLButtonElement).style.color =
                          t.accent;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = `${t.accent}08`;
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.borderColor = t.border;
                        (e.currentTarget as HTMLButtonElement).style.color =
                          t.textMuted;
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = t.surfaceAlt;
                      }}
                    >
                      Explore →
                    </button>
                    <button
                      onClick={() => onStudy(entry.source_pdf)}
                      style={{
                        flex: 1,
                        padding: "9px 0",
                        background: `linear-gradient(135deg, ${t.accent}, ${t.accentAlt})`,
                        border: "none",
                        borderRadius: 10,
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: FONTS.body,
                        fontWeight: 700,
                        boxShadow: `0 3px 10px ${t.accentGlow}`,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 5px 16px ${t.accentGlow}`;
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "translateY(-1px)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.boxShadow =
                          `0 3px 10px ${t.accentGlow}`;
                        (e.currentTarget as HTMLButtonElement).style.transform =
                          "";
                      }}
                    >
                      ▶ Study
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Add card */}
            <div
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) onUpload(f);
              }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{
                background: t.surfaceAlt,
                border: `2px dashed ${t.borderStrong}`,
                borderRadius: 18,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                cursor: "pointer",
                minHeight: 220,
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  t.accent;
                (e.currentTarget as HTMLDivElement).style.background =
                  `${t.accent}06`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  t.borderStrong;
                (e.currentTarget as HTMLDivElement).style.background =
                  t.surfaceAlt;
              }}
            >
              <div style={{ fontSize: 28, color: t.textFaint }}>+</div>
              <div
                style={{
                  fontSize: 12,
                  color: t.textMuted,
                  fontWeight: 600,
                  fontFamily: FONTS.body,
                }}
              >
                Upload another PDF
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
