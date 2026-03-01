"use client";

import { useState } from "react";
import type { Topic, DagEdge, DagNode } from "@/types";
import { layoutDag, NODE_W, NODE_H } from "@/lib/utils";
import { KT, FONTS, clusterColor, type KTheme } from "@/theme";

export default function DagVisualizer({
  topics,
  dagEdges,
  theme = "light",
}: {
  topics: Topic[];
  dagEdges: DagEdge[];
  theme?: KTheme;
}) {
  const t = KT[theme];
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredEdge, setHoveredEdge] = useState<number | null>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);

  const topicLabelMap: Record<string, string> = {};
  topics.forEach((tp) => (topicLabelMap[tp.topic_id] = tp.label));

  const enrichedEdges: DagEdge[] = dagEdges.map((e) => ({
    ...e,
    from_label:
      e.from_label || topicLabelMap[e.from_topic] || e.from_topic.slice(0, 12),
    to_label:
      e.to_label || topicLabelMap[e.to_topic] || e.to_topic.slice(0, 12),
  }));

  if (!topics.length)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: t.textMuted,
          fontSize: 14,
          fontFamily: FONTS.body,
        }}
      >
        No topics extracted yet. Upload a PDF first.
      </div>
    );

  if (!dagEdges.length)
    return (
      <div
        style={{
          padding: 60,
          textAlign: "center",
          color: t.textMuted,
          fontSize: 14,
          fontFamily: FONTS.body,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 10 }}>🕸</div>
        No DAG edges found for this PDF.
        <br />
        <span style={{ fontSize: 12, color: t.textFaint }}>
          This can happen if all topics appear on the same page, or the LLM
          pruned all edges.
        </span>
      </div>
    );

  const { nodes } = layoutDag(topics, enrichedEdges);
  if (!nodes.length) return null;

  const PAD = 60;
  const maxX = Math.max(...nodes.map((n) => n.x)) + NODE_W + PAD;
  const maxY = Math.max(...nodes.map((n) => n.y)) + NODE_H + PAD;
  const svgW = Math.max(maxX + PAD, 600);
  const svgH = Math.max(maxY + PAD, 300);

  const nodePos: Record<string, DagNode> = {};
  nodes.forEach((n) => (nodePos[n.topic_id] = n));

  const edgeColor = t.accent;
  const edgeHover = t.accentAlt;

  return (
    <div style={{ position: "relative", fontFamily: FONTS.body }}>
      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: 20,
          marginBottom: 14,
          fontSize: 12,
          color: t.textMuted,
          flexWrap: "wrap",
        }}
      >
        <span>
          <span style={{ color: edgeColor }}>━━▶</span> prerequisite edge
        </span>
        <span style={{ color: t.textFaint }}>
          Hover nodes/edges for details
        </span>
        <span style={{ color: t.textFaint }}>
          {nodes.length} topics · {enrichedEdges.length} edges
        </span>
      </div>

      {/* SVG canvas */}
      <div
        style={{
          overflowX: "auto",
          overflowY: "auto",
          maxHeight: 520,
          borderRadius: 14,
          border: `1px solid ${t.border}`,
          boxShadow: t.shadow,
        }}
      >
        <svg
          width={svgW}
          height={svgH}
          style={{ display: "block", background: t.surfaceAlt }}
        >
          <defs>
            <marker
              id="dag-arrow-default"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={edgeColor}
                opacity="0.65"
              />
            </marker>
            <marker
              id="dag-arrow-hover"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill={edgeHover} />
            </marker>
          </defs>

          {/* Edges */}
          {enrichedEdges.map((edge, i) => {
            const from = nodePos[edge.from_topic];
            const to = nodePos[edge.to_topic];
            if (!from || !to) return null;
            const isHovered =
              hoveredEdge === i ||
              hoveredNode === edge.from_topic ||
              hoveredNode === edge.to_topic;
            const x1 = from.x + PAD + NODE_W / 2;
            const y1 = from.y + PAD + NODE_H;
            const x2 = to.x + PAD + NODE_W / 2;
            const y2 = to.y + PAD;
            const cy1 = y1 + (y2 - y1) * 0.4;
            const cy2 = y2 - (y2 - y1) * 0.4;
            const d = `M ${x1} ${y1} C ${x1} ${cy1}, ${x2} ${cy2}, ${x2} ${y2}`;
            return (
              <g key={i}>
                <path
                  d={d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={16}
                  style={{ cursor: "pointer" }}
                  onMouseEnter={(ev) => {
                    setHoveredEdge(i);
                    setTooltip({
                      x: ev.clientX + 12,
                      y: ev.clientY + 12,
                      text: `${edge.from_label} → ${edge.to_label}\n${edge.evidence || "textbook order"}`,
                    });
                  }}
                  onMouseLeave={() => {
                    setHoveredEdge(null);
                    setTooltip(null);
                  }}
                />
                <path
                  d={d}
                  fill="none"
                  stroke={isHovered ? edgeHover : edgeColor}
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  strokeOpacity={isHovered ? 1 : 0.55}
                  markerEnd={`url(#dag-arrow-${isHovered ? "hover" : "default"})`}
                  style={{ transition: "stroke 0.15s" }}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const color = clusterColor(node.cluster_id);
            const isHovered = hoveredNode === node.topic_id;
            const nx = node.x + PAD;
            const ny = node.y + PAD;
            const displayLabel =
              node.label.length > 18
                ? node.label.slice(0, 16) + "…"
                : node.label;
            return (
              <g
                key={node.topic_id}
                style={{ cursor: "pointer" }}
                onMouseEnter={(ev) => {
                  setHoveredNode(node.topic_id);
                  setTooltip({
                    x: ev.clientX + 12,
                    y: ev.clientY + 12,
                    text: `${node.label}\nCluster ${node.cluster_id} · Level ${node.level}`,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredNode(null);
                  setTooltip(null);
                }}
              >
                {isHovered && (
                  <rect
                    x={nx - 2}
                    y={ny + 3}
                    width={NODE_W + 4}
                    height={NODE_H + 4}
                    rx={11}
                    fill={color}
                    opacity={0.1}
                  />
                )}
                <rect
                  x={nx}
                  y={ny}
                  width={NODE_W}
                  height={NODE_H}
                  rx={10}
                  fill={isHovered ? `${color}0E` : t.surface}
                  stroke={isHovered ? color : `${color}45`}
                  strokeWidth={isHovered ? 2 : 1.5}
                />
                {/* Top color bar */}
                <rect
                  x={nx}
                  y={ny}
                  width={NODE_W}
                  height={4}
                  rx={4}
                  fill={color}
                  opacity={0.85}
                />
                {/* Label */}
                <text
                  x={nx + NODE_W / 2}
                  y={ny + NODE_H / 2 + 6}
                  textAnchor="middle"
                  fill={isHovered ? t.text : t.textMuted}
                  fontSize={12}
                  fontFamily="system-ui, sans-serif"
                  fontWeight={isHovered ? "700" : "500"}
                >
                  {displayLabel}
                </text>
                {/* Cluster badge */}
                <text
                  x={nx + 6}
                  y={ny + 15}
                  fill={color}
                  fontSize={9}
                  fontFamily="monospace"
                  opacity={0.75}
                >
                  C{node.cluster_id}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: 10,
            padding: "10px 14px",
            fontSize: 12,
            color: t.text,
            zIndex: 999,
            pointerEvents: "none",
            maxWidth: 300,
            whiteSpace: "pre-wrap",
            lineHeight: 1.7,
            boxShadow: t.shadowLg,
            fontFamily: FONTS.body,
          }}
        >
          {tooltip.text}
        </div>
      )}

      {/* Edge list */}
      <div style={{ marginTop: 22 }}>
        <div
          style={{
            fontSize: 11,
            color: t.textFaint,
            fontWeight: 700,
            letterSpacing: 1.5,
            marginBottom: 10,
            textTransform: "uppercase",
            fontFamily: FONTS.body,
          }}
        >
          Prerequisite Edges ({enrichedEdges.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {enrichedEdges.map((e, i) => (
            <div
              key={i}
              style={{
                padding: "11px 14px",
                background: t.surface,
                border: `1px solid ${t.border}`,
                borderRadius: 10,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontSize: 12,
                boxShadow: t.shadow,
                fontFamily: FONTS.body,
              }}
            >
              <span
                style={{
                  color: t.accent,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {e.from_label || e.from_topic.slice(0, 16)}
              </span>
              <span style={{ color: t.textFaint }}>──prereq──▶</span>
              <span
                style={{
                  color: t.accentAlt,
                  fontWeight: 800,
                  whiteSpace: "nowrap",
                }}
              >
                {e.to_label || e.to_topic.slice(0, 16)}
              </span>
              <span
                style={{
                  color: t.textMuted,
                  flex: 1,
                  fontSize: 11,
                  lineHeight: 1.5,
                }}
              >
                {e.evidence}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
