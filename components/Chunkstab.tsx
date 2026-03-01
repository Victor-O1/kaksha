"use client";

import { useState } from "react";
import type { Chunk } from "@/types";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

interface ChunksTabProps {
  chunks: Chunk[];
  selectedCluster: number | null;
  onClearCluster: () => void;
  theme?: KTheme;
}

export default function ChunksTab({
  chunks,
  selectedCluster,
  onClearCluster,
  theme = "light",
}: ChunksTabProps) {
  const t = KT[theme];
  const [expandedChunk, setExpandedChunk] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: FONTS.body }}>
      {selectedCluster !== null && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 16px",
            background: `${clusterColor(selectedCluster)}08`,
            border: `1.5px solid ${clusterColor(selectedCluster)}28`,
            borderRadius: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 12,
          }}
        >
          <span style={{ fontWeight: 600, color: t.text }}>
            Filtered by{" "}
            <span
              style={{ color: clusterColor(selectedCluster), fontWeight: 800 }}
            >
              Cluster {selectedCluster}
            </span>{" "}
            · {chunks.length} chunks
          </span>
          <button
            onClick={onClearCluster}
            style={{
              background: "transparent",
              border: `1px solid ${t.border}`,
              borderRadius: 6,
              color: t.textMuted,
              cursor: "pointer",
              fontSize: 11,
              fontFamily: FONTS.body,
              padding: "3px 10px",
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
              (e.currentTarget as HTMLButtonElement).style.color = t.textMuted;
            }}
          >
            Clear ✕
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {chunks.map((chunk) => {
          const isExpanded = expandedChunk === chunk.chunk_id;
          const color = clusterColor(chunk.cluster_id);
          return (
            <div
              key={chunk.chunk_id}
              style={{
                background: t.surface,
                border: `1px solid ${isExpanded ? t.borderStrong : t.border}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 11,
                overflow: "hidden",
                boxShadow: isExpanded ? t.shadowMd : t.shadow,
                transition: "all 0.15s",
              }}
            >
              <div
                onClick={() =>
                  setExpandedChunk(isExpanded ? null : chunk.chunk_id)
                }
                style={{
                  padding: "11px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  cursor: "pointer",
                  background: isExpanded ? `${color}05` : "transparent",
                  transition: "background 0.15s",
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 7px",
                    background: `${color}15`,
                    color,
                    borderRadius: 8,
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  C{chunk.cluster_id ?? "?"}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    color: t.textMuted,
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {chunk.text.slice(0, 110)}…
                </span>
                <span
                  style={{
                    fontSize: 11,
                    color: t.textFaint,
                    whiteSpace: "nowrap",
                  }}
                >
                  p.{chunk.page_num} · {chunk.token_count}t
                </span>
                <span
                  style={{ color: t.textFaint, fontSize: 11, marginLeft: 2 }}
                >
                  {isExpanded ? "▲" : "▼"}
                </span>
              </div>

              {isExpanded && (
                <div
                  style={{
                    padding: "0 14px 14px",
                    borderTop: `1px solid ${t.border}`,
                  }}
                >
                  <div
                    style={{
                      marginTop: 12,
                      fontSize: 14,
                      lineHeight: 1.9,
                      color: t.text,
                      fontWeight: 400,
                      fontFamily: FONTS.body,
                    }}
                  >
                    {chunk.text}
                  </div>
                  <div
                    style={{
                      marginTop: 12,
                      display: "flex",
                      gap: 14,
                      fontSize: 10,
                      color: t.textFaint,
                      fontFamily: FONTS.mono,
                      paddingTop: 10,
                      borderTop: `1px solid ${t.border}`,
                    }}
                  >
                    <span>ID: {chunk.chunk_id}</span>
                    <span>Page: {chunk.page_num}</span>
                    <span>Tokens: {chunk.token_count}</span>
                    <span>Cluster: {chunk.cluster_id ?? "unassigned"}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
