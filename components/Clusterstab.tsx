"use client";

import type { ClusterSummary } from "@/types";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

interface ClustersTabProps {
  clusters: ClusterSummary[];
  selectedCluster: number | null;
  onSelectCluster: (id: number) => void;
  onStudyCluster: () => void;
  theme?: KTheme;
}

export default function ClustersTab({
  clusters,
  selectedCluster,
  onSelectCluster,
  onStudyCluster,
  theme = "light",
}: ClustersTabProps) {
  const t = KT[theme];

  return (
    <div style={{ fontFamily: FONTS.body }}>
      <p
        style={{
          fontSize: 13,
          color: t.textMuted,
          marginBottom: 22,
          fontWeight: 500,
        }}
      >
        Click a cluster to explore its chunks. Each cluster represents a topic
        group identified by K-means.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        {clusters
          .sort((a, b) => a.cluster_id - b.cluster_id)
          .map((cl) => {
            const color = clusterColor(cl.cluster_id);
            const isSelected = selectedCluster === cl.cluster_id;
            return (
              <div
                key={cl.cluster_id}
                onClick={() => onSelectCluster(cl.cluster_id)}
                style={{
                  padding: "18px 20px",
                  background: isSelected ? `${color}08` : t.surface,
                  border: `1.5px solid ${isSelected ? color : t.border}`,
                  borderLeft: `4px solid ${color}`,
                  borderRadius: 14,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  boxShadow: isSelected ? `0 4px 20px ${color}20` : t.shadow,
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      `${color}80`;
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      `0 4px 16px ${color}15`;
                    (e.currentTarget as HTMLDivElement).style.background =
                      `${color}04`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    (e.currentTarget as HTMLDivElement).style.borderColor =
                      t.border;
                    (e.currentTarget as HTMLDivElement).style.boxShadow =
                      t.shadow;
                    (e.currentTarget as HTMLDivElement).style.background =
                      t.surface;
                  }
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${color}15`,
                      border: `1.5px solid ${color}35`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      fontWeight: 800,
                      color,
                      fontFamily: FONTS.body,
                    }}
                  >
                    C{cl.cluster_id}
                  </div>
                  {isSelected && (
                    <span
                      style={{
                        fontSize: 10,
                        background: `${color}15`,
                        color,
                        padding: "2px 8px",
                        borderRadius: 20,
                        fontWeight: 700,
                      }}
                    >
                      Active
                    </span>
                  )}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: t.text,
                    marginBottom: 5,
                    lineHeight: 1.3,
                    fontFamily: FONTS.display,
                  }}
                >
                  {cl.label ?? "Unlabeled"}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: t.textMuted,
                    fontWeight: 500,
                    marginBottom: 14,
                  }}
                >
                  {cl.chunk_count} chunks
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStudyCluster();
                  }}
                  style={{
                    width: "100%",
                    padding: "7px 0",
                    background: `${color}0E`,
                    border: `1px solid ${color}28`,
                    borderRadius: 8,
                    color,
                    cursor: "pointer",
                    fontSize: 11,
                    fontWeight: 700,
                    fontFamily: FONTS.body,
                    transition: "all 0.15s",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      `${color}1E`)
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLButtonElement).style.background =
                      `${color}0E`)
                  }
                >
                  ▶ Study This
                </button>
              </div>
            );
          })}
      </div>
    </div>
  );
}
