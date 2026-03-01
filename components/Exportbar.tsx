"use client";

import type { PipelineData } from "@/types";
import { downloadJSON, downloadCSV } from "@/lib/utils";
import { KT, FONTS, type KTheme } from "@/theme";

export default function ExportBar({
  pipelineData,
  theme = "light",
}: {
  pipelineData: PipelineData;
  theme?: KTheme;
}) {
  const t = KT[theme];
  const base = pipelineData.source_pdf.replace(".pdf", "");

  const groups = [
    {
      label: "Chunks",
      color: t.success,
      items: [
        {
          label: "chunks.json",
          fn: () => downloadJSON(pipelineData.chunks, `${base}_chunks.json`),
        },
        {
          label: "chunks.csv",
          fn: () =>
            downloadCSV(
              pipelineData.chunks.map((c) => ({
                chunk_id: c.chunk_id,
                page_num: c.page_num,
                cluster_id: c.cluster_id ?? "",
                token_count: c.token_count,
                text: c.text,
              })),
              `${base}_chunks.csv`,
            ),
        },
      ],
    },
    {
      label: "Clusters",
      color: t.warn,
      items: [
        {
          label: "clusters.json",
          fn: () =>
            downloadJSON(
              pipelineData.clusters.map((cl) => ({
                ...cl,
                chunks: pipelineData.chunks.filter(
                  (c) => c.cluster_id === cl.cluster_id,
                ),
              })),
              `${base}_clusters.json`,
            ),
        },
        {
          label: "clusters.csv",
          fn: () =>
            downloadCSV(
              pipelineData.clusters.map((cl) => ({
                cluster_id: cl.cluster_id,
                label: cl.label ?? "",
                chunk_count: cl.chunk_count,
              })),
              `${base}_clusters.csv`,
            ),
        },
      ],
    },
    {
      label: "DAG",
      color: t.error,
      items: [
        {
          label: "dag.json",
          fn: () =>
            downloadJSON(
              { topics: pipelineData.topics, edges: pipelineData.dag_edges },
              `${base}_dag.json`,
            ),
        },
        {
          label: "dag.csv",
          fn: () =>
            downloadCSV(
              pipelineData.dag_edges.map((e) => ({
                from_topic: e.from_topic,
                from_label: e.from_label ?? "",
                to_topic: e.to_topic,
                to_label: e.to_label ?? "",
                evidence: e.evidence,
                cosine_similarity: e.cosine_similarity,
              })),
              `${base}_dag.csv`,
            ),
        },
      ],
    },
    {
      label: "Full",
      color: t.textMuted,
      items: [
        {
          label: "⬇ pipeline.json",
          fn: () => downloadJSON(pipelineData, `${base}_full_pipeline.json`),
        },
      ],
    },
  ];

  return (
    <div
      style={{
        padding: "7px 32px",
        borderBottom: `1px solid ${t.border}`,
        display: "flex",
        gap: 6,
        alignItems: "center",
        flexWrap: "wrap",
        background: t.surfaceAlt,
      }}
    >
      <span
        style={{
          fontSize: 10,
          color: t.textFaint,
          letterSpacing: 1.5,
          fontWeight: 700,
          marginRight: 6,
          fontFamily: FONTS.body,
          textTransform: "uppercase",
        }}
      >
        Export
      </span>

      {groups.map(({ label, color, items }) => (
        <div
          key={label}
          style={{ display: "flex", gap: 3, alignItems: "center" }}
        >
          <span
            style={{
              fontSize: 10,
              color: t.textFaint,
              fontFamily: FONTS.body,
              paddingRight: 3,
              fontWeight: 600,
            }}
          >
            {label}:
          </span>
          {items.map(({ label: iLabel, fn }) => (
            <button
              key={iLabel}
              onClick={fn}
              style={{
                padding: "4px 10px",
                fontSize: 10,
                fontFamily: FONTS.body,
                fontWeight: 700,
                background: `${color}0E`,
                border: `1px solid ${color}28`,
                color,
                borderRadius: 6,
                cursor: "pointer",
                letterSpacing: 0.3,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  `${color}1E`;
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  `${color}50`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background =
                  `${color}0E`;
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  `${color}28`;
              }}
            >
              {iLabel}
            </button>
          ))}
          <div
            style={{
              width: 1,
              height: 16,
              background: t.border,
              marginLeft: 3,
            }}
          />
        </div>
      ))}
    </div>
  );
}
