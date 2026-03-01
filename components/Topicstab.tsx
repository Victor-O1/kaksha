"use client";
// ─── Topicstab ────────────────────────────────────────────────────────────────

import type { Topic } from "@/types";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

export function TopicsTab({
  topics,
  theme = "light",
}: {
  topics: Topic[];
  theme?: KTheme;
}) {
  const t = KT[theme];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 9,
        fontFamily: FONTS.body,
      }}
    >
      <p
        style={{
          fontSize: 13,
          color: t.textMuted,
          marginBottom: 6,
          fontWeight: 500,
        }}
      >
        Topic labels extracted by Groq llama-3.1-8b-instant per K-means cluster.
      </p>
      {topics
        .sort((a, b) => a.cluster_id - b.cluster_id)
        .map((topic) => {
          const color = clusterColor(topic.cluster_id);
          return (
            <div
              key={topic.topic_id}
              style={{
                padding: "15px 18px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderLeft: `4px solid ${color}`,
                borderRadius: 13,
                boxShadow: t.shadow,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow =
                  `0 4px 16px ${color}18`;
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  `${color}60`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = t.shadow;
                (e.currentTarget as HTMLDivElement).style.borderColor =
                  t.border;
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  marginBottom: 7,
                }}
              >
                <span
                  style={{
                    fontSize: 10,
                    padding: "2px 9px",
                    background: `${color}12`,
                    border: `1px solid ${color}28`,
                    color,
                    borderRadius: 20,
                    fontWeight: 800,
                  }}
                >
                  CLUSTER {topic.cluster_id}
                </span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: t.text,
                    fontFamily: FONTS.display,
                  }}
                >
                  {topic.label}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  fontSize: 12,
                  color: t.textMuted,
                }}
              >
                <span>
                  Core:{" "}
                  <span
                    style={{
                      color: t.textFaint,
                      fontFamily: FONTS.mono,
                      fontSize: 11,
                    }}
                  >
                    {topic.core_chunk_id.slice(0, 20)}…
                  </span>
                </span>
                <span>
                  Supporting:{" "}
                  <span style={{ fontWeight: 700, color: t.text }}>
                    {topic.supporting_chunk_ids.length} chunks
                  </span>
                </span>
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: t.textFaint,
                  marginTop: 5,
                  fontFamily: FONTS.mono,
                }}
              >
                {topic.topic_id}
              </div>
            </div>
          );
        })}
    </div>
  );
}
