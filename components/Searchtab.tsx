"use client";

import type { SearchResult } from "@/types";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

export default function SearchTab({
  searchResult,
  theme = "light",
}: {
  searchResult: SearchResult | null;
  theme?: KTheme;
}) {
  const t = KT[theme];

  if (!searchResult)
    return (
      <div
        style={{
          textAlign: "center",
          padding: "80px 40px",
          color: t.textMuted,
          fontSize: 14,
          fontFamily: FONTS.body,
        }}
      >
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
        Type a query above and press Search or Enter.
      </div>
    );

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {/* Query banner */}
      <div
        style={{
          marginBottom: 18,
          padding: "12px 16px",
          background: t.successBg,
          border: `1.5px solid ${t.successBorder}`,
          borderRadius: 10,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span style={{ fontWeight: 800, color: t.success }}>Query:</span>
        <span style={{ color: t.text, fontStyle: "italic" }}>
          "{searchResult.query}"
        </span>
        <span style={{ color: t.textFaint, marginLeft: "auto" }}>
          {searchResult.chunks.length} chunks · {searchResult.clusters.length}{" "}
          clusters
        </span>
      </div>

      {/* Matched clusters */}
      {searchResult.clusters.length > 0 && (
        <div style={{ marginBottom: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: t.textFaint,
              fontWeight: 700,
              letterSpacing: 1.5,
              marginBottom: 8,
              textTransform: "uppercase",
            }}
          >
            Matched Clusters
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {searchResult.clusters.map((c) => {
              const color = clusterColor(c.cluster_id);
              return (
                <span
                  key={c.cluster_id}
                  style={{
                    padding: "5px 13px",
                    background: `${color}0E`,
                    border: `1.5px solid ${color}35`,
                    borderRadius: 20,
                    fontSize: 12,
                    color,
                    fontWeight: 700,
                  }}
                >
                  {c.label}{" "}
                  <span style={{ opacity: 0.45 }}>(C{c.cluster_id})</span>
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Result chunks */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {searchResult.chunks.map((chunk, i) => {
          const color = clusterColor(chunk.cluster_id);
          return (
            <div
              key={chunk.chunk_id}
              style={{
                padding: "15px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 12,
                boxShadow: t.shadow,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#fff",
                    background: t.accent,
                    padding: "2px 7px",
                    borderRadius: 6,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color,
                    padding: "2px 7px",
                    background: `${color}12`,
                    borderRadius: 6,
                    fontWeight: 700,
                  }}
                >
                  C{chunk.cluster_id}
                </span>
                {chunk.similarity !== undefined && (
                  <span
                    style={{
                      fontSize: 11,
                      color: t.textMuted,
                      background: t.surfaceAlt,
                      padding: "2px 7px",
                      borderRadius: 6,
                    }}
                  >
                    {(chunk.similarity * 100).toFixed(1)}% match
                  </span>
                )}
                <span
                  style={{
                    fontSize: 11,
                    color: t.textFaint,
                    marginLeft: "auto",
                  }}
                >
                  p.{chunk.page_num} · {chunk.token_count} tok
                </span>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.9, color: t.text }}>
                {chunk.text}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
