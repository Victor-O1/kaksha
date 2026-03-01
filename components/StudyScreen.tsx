"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Topic, DagEdge } from "@/types";
import {
  getClusterColor,
  layoutDag,
  NODE_W,
  NODE_H,
  getLevel,
} from "@/lib/utils";

const API = "http://localhost:8000";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Concept {
  concept_id: string;
  name: string;
  concept_type: string;
  definition_text: string;
  key_points: string[];
  cluster_id: number;
  source_chunk_ids: string[];
  concept_index: number;
}

interface ConceptMastery {
  concept_id: string;
  concept_name: string;
  mastery_score: number;
  attempts: number;
  correct: number;
  remark?: string;
}

interface Question {
  type: "mcq" | "short_answer" | "true_false" | "fill_blank";
  question: string;
  options?: string[];
  answer: string;
  explanation: string;
  concept_name?: string;
}

interface ExplainResponse {
  concept_id: string;
  concept_name: string;
  concept_type: string;
  definition_text: string;
  key_points: string[];
  cluster_id: number;
  topic_label: string;
  source_chunks?: { chunk_id: string; text: string; page_num?: number }[];
  explanation: string;
  aid_type: string;
  aid_content: string;
  aid_label: string;
  questions: Question[];
  prev_remark?: string;
}

interface SessionState {
  session_id: string;
  status: string;
  current_cluster: number;
  topic_label: string;
  total_clusters: number;
  concepts: Concept[];
  concept_mastery: ConceptMastery[];
  unmastered_count: number;
  next_concept: Concept | null;
  all_concepts_mastered: boolean;
  prev_cluster_remark?: string;
}

// ─── Mermaid Renderer (robust, 3-layer) ──────────────────────────────────────
// Layer 1: Load Mermaid 11 from CDN (avoids Next.js SSR/npm version issues)
// Layer 2: Auto-sanitize common LLM syntax mistakes before rendering
// Layer 3: On any failure → render a clean SVG flowchart (never blank for demo)

declare global {
  interface Window {
    mermaid?: {
      initialize: (cfg: object) => void;
      render: (id: string, code: string) => Promise<{ svg: string }>;
    };
    _mermaidLoading?: boolean;
    _mermaidLoaded?: boolean;
    _mermaidCallbacks?: (() => void)[];
  }
}

function loadMermaidCDN(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    if (window._mermaidLoaded && window.mermaid) {
      resolve();
      return;
    }
    if (window._mermaidLoading) {
      window._mermaidCallbacks = window._mermaidCallbacks || [];
      window._mermaidCallbacks.push(() => resolve());
      return;
    }
    window._mermaidLoading = true;
    window._mermaidCallbacks = [];
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    s.async = true;
    s.onload = () => {
      window._mermaidLoaded = true;
      window._mermaidLoading = false;
      window.mermaid?.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
      });
      window._mermaidCallbacks?.forEach((cb) => cb());
      window._mermaidCallbacks = [];
      resolve();
    };
    s.onerror = () => {
      window._mermaidLoading = false;
      reject(new Error("CDN failed"));
    };
    document.head.appendChild(s);
  });
}

function sanitizeMermaid(raw: string): string {
  let s = raw
    .trim()
    .replace(/^```mermaid\s*/i, "")
    .replace(/\s*```$/, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  const hasHeader =
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|gitGraph)\b/i.test(
      s,
    );
  if (!hasHeader) s = "graph TD\n" + s;
  s = s
    .replace(/->>>/g, "-->>")
    .replace(/;(\s*\n)/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
  return s;
}

interface FBNode {
  id: string;
  label: string;
}
interface FBEdge {
  from: string;
  to: string;
  label?: string;
}

function parseFallback(raw: string): { nodes: FBNode[]; edges: FBEdge[] } {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const nodes: FBNode[] = [];
  const edges: FBEdge[] = [];
  const nodeSet = new Set<string>();
  for (const line of lines) {
    if (
      /^(graph|flowchart|sequenceDiagram|style|classDef|subgraph|end|%%)\b/i.test(
        line,
      )
    )
      continue;
    const edgeM = line.match(
      /^([A-Za-z0-9_]+)(?:\[.*?\])?\s*(?:-->|-->>|->|==>|-.->|--)\s*([A-Za-z0-9_]+)/,
    );
    if (edgeM) {
      edges.push({ from: edgeM[1], to: edgeM[2] });
      [edgeM[1], edgeM[2]].forEach((id) => nodeSet.add(id));
      continue;
    }
    const nodeM = line.match(/^([A-Za-z0-9_]+)[\[({]([^\]})]+)[\]})]/);
    if (nodeM && !nodes.find((n) => n.id === nodeM[1])) {
      nodes.push({ id: nodeM[1], label: nodeM[2] });
      nodeSet.add(nodeM[1]);
    }
  }
  for (const id of nodeSet) {
    if (!nodes.find((n) => n.id === id)) {
      const lm = raw.match(new RegExp(id + "[\\[({]([^\\]})]+)[\\]})"));
      nodes.push({ id, label: lm ? lm[1] : id });
    }
  }
  const seen = new Set<string>();
  return {
    nodes: nodes.filter((n) => {
      if (seen.has(n.id)) return false;
      seen.add(n.id);
      return true;
    }),
    edges,
  };
}

function FallbackDiagram({ raw, color }: { raw: string; color: string }) {
  const { nodes, edges } = parseFallback(raw);
  if (!nodes.length) {
    return (
      <pre
        style={{
          padding: "12px 16px",
          background: "#F8F6F1",
          borderRadius: 10,
          border: "1px solid #E4DDD2",
          fontSize: 12,
          color: "#4A4840",
          whiteSpace: "pre-wrap",
          lineHeight: 1.8,
          overflowX: "auto",
        }}
      >
        {raw}
      </pre>
    );
  }
  const NW = 160,
    NH = 38,
    HGAP = 50,
    VGAP = 60;
  const inDeg: Record<string, number> = {};
  nodes.forEach((n) => (inDeg[n.id] = 0));
  edges.forEach((e) => {
    inDeg[e.to] = (inDeg[e.to] || 0) + 1;
  });
  const level: Record<string, number> = {};
  const q = nodes.filter((n) => !inDeg[n.id]).map((n) => n.id);
  if (!q.length) q.push(nodes[0].id);
  q.forEach((r) => (level[r] = 0));
  while (q.length) {
    const cur = q.shift()!;
    edges
      .filter((e) => e.from === cur)
      .forEach((e) => {
        if (level[e.to] === undefined) {
          level[e.to] = (level[cur] || 0) + 1;
          q.push(e.to);
        }
      });
  }
  nodes.forEach((n) => {
    if (level[n.id] === undefined) level[n.id] = 0;
  });
  const byLevel: Record<number, string[]> = {};
  nodes.forEach((n) => {
    const lv = level[n.id] ?? 0;
    (byLevel[lv] = byLevel[lv] || []).push(n.id);
  });
  const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
  const maxPL = Math.max(...Object.values(byLevel).map((a) => a.length));
  const pos: Record<string, { x: number; y: number }> = {};
  Object.entries(byLevel).forEach(([lv, ids]) => {
    const lvN = Number(lv);
    const tw = ids.length * NW + (ids.length - 1) * HGAP;
    const sx = (maxPL * (NW + HGAP) - tw) / 2;
    ids.forEach((id, i) => {
      pos[id] = { x: sx + i * (NW + HGAP), y: lvN * (NH + VGAP) + 16 };
    });
  });
  const svgW = Math.max(maxPL * (NW + HGAP) + 40, 380);
  const svgH = (maxLevel + 1) * (NH + VGAP) + 40;
  const pallete = [color, "#2D6AC4", "#2A7A4B", "#7C3D8A", "#B8860B"];
  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 10,
        background: "#FAFAF8",
        padding: "6px 0",
      }}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ display: "block", margin: "0 auto" }}
      >
        <defs>
          <marker
            id="fb-arr"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={color} opacity="0.65" />
          </marker>
        </defs>
        {edges.map((edge, i) => {
          const f = pos[edge.from],
            t = pos[edge.to];
          if (!f || !t) return null;
          const x1 = f.x + NW / 2,
            y1 = f.y + NH,
            x2 = t.x + NW / 2,
            y2 = t.y,
            my = (y1 + y2) / 2;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`}
              fill="none"
              stroke={color}
              strokeWidth={1.5}
              strokeOpacity={0.5}
              markerEnd="url(#fb-arr)"
            />
          );
        })}
        {nodes.map((node) => {
          const p = pos[node.id];
          if (!p) return null;
          const nc = pallete[level[node.id] % pallete.length];
          const label =
            node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label;
          return (
            <g key={node.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NW}
                height={NH}
                rx={8}
                fill={`${nc}12`}
                stroke={`${nc}45`}
                strokeWidth={1.5}
              />
              <rect
                x={p.x}
                y={p.y}
                width={NW}
                height={4}
                rx={3}
                fill={nc}
                opacity={0.8}
              />
              <text
                x={p.x + NW / 2}
                y={p.y + NH / 2 + 6}
                textAnchor="middle"
                fill={nc}
                fontSize={11}
                fontFamily="system-ui, sans-serif"
                fontWeight="600"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function MermaidDiagram({
  code,
  accentColor = "#C4622D",
}: {
  code: string;
  accentColor?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "fallback">("loading");
  const [svg, setSvg] = useState("");
  const attempt = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const id = ++attempt.current;
    const uid = "mmd_" + id + "_" + Date.now();

    async function tryRender(c: string) {
      await loadMermaidCDN();
      if (!window.mermaid) throw new Error("no mermaid");
      document.getElementById(uid)?.remove();
      return (await window.mermaid.render(uid, c)).svg;
    }

    async function run() {
      const clean = sanitizeMermaid(code);
      try {
        const s = await tryRender(clean);
        if (!cancelled && id === attempt.current) {
          setSvg(s);
          setState("ok");
        }
      } catch {
        // Retry without style/class lines
        const stripped = clean
          .split("\n")
          .filter((l) => !/^(style|classDef|class)\s/.test(l.trim()))
          .join("\n");
        try {
          const s = await tryRender(stripped);
          if (!cancelled && id === attempt.current) {
            setSvg(s);
            setState("ok");
          }
        } catch {
          if (!cancelled && id === attempt.current) setState("fallback");
        }
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (state === "loading")
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "14px 16px",
          background: "#F8F6F1",
          borderRadius: 10,
          border: "1px solid #E4DDD2",
          fontSize: 12,
          color: "#8A8275",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <style>{`@keyframes mmdSpin{to{transform:rotate(360deg)}}`}</style>
        <div
          style={{
            width: 13,
            height: 13,
            borderRadius: "50%",
            border: "2px solid #E4DDD2",
            borderTop: `2px solid ${accentColor}`,
            animation: "mmdSpin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        Rendering diagram…
      </div>
    );

  if (state === "ok")
    return (
      <div
        style={{
          overflowX: "auto",
          borderRadius: 10,
          background: "#FAFAF8",
          padding: 8,
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    );

  return (
    <div>
      <div
        style={{
          fontSize: 10,
          color: "#B0A89E",
          marginBottom: 6,
          fontFamily: "'DM Sans', system-ui, sans-serif",
          display: "flex",
          alignItems: "center",
          gap: 5,
        }}
      >
        <span>📊</span>
        <span style={{ fontWeight: 600 }}>Diagram (fallback renderer)</span>
      </div>
      <FallbackDiagram raw={sanitizeMermaid(code)} color={accentColor} />
    </div>
  );
}

// ─── Teaching Aid ─────────────────────────────────────────────────────────────

function TeachingAid({
  type,
  content,
  label,
}: {
  type: string;
  content: string;
  label: string;
}) {
  if (!content || !type || type === "none") return null;

  const cfg: Record<string, { icon: string; color: string }> = {
    mnemonic: { icon: "🧠", color: "#8B5CF6" },
    analogy: { icon: "💡", color: "#F59E0B" },
    diagram: { icon: "📊", color: "#3B82F6" },
    table: { icon: "📋", color: "#10B981" },
    example: { icon: "🔢", color: "#EF4444" },
    none: { icon: "📌", color: "#6B7280" },
  };
  const { icon, color } = cfg[type] ?? { icon: "💡", color: "#6C63FF" };

  const isMermaid =
    type === "diagram" ||
    content.trim().startsWith("```mermaid") ||
    content.trim().startsWith("graph ") ||
    content.trim().startsWith("flowchart ");
  const cleanCode = content
    .replace(/^```mermaid\n?/, "")
    .replace(/\n?```$/, "")
    .trim();

  const isTable = type === "table" && content.includes("|");

  return (
    <div
      style={{
        background: `${color}06`,
        border: `1.5px solid ${color}25`,
        borderLeft: `4px solid ${color}`,
        borderRadius: 14,
        padding: "16px 20px",
        marginTop: 16,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
          fontSize: 11,
          fontWeight: 800,
          color,
          letterSpacing: 0.5,
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: 16 }}>{icon}</span>
        {label || type}
      </div>

      {isMermaid ? (
        <MermaidDiagram code={cleanCode} accentColor={color} />
      ) : isTable ? (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}
          >
            {content
              .split("\n")
              .filter((l) => l.trim() && l.replace(/[\s|:-]/g, "").length !== 0)
              .map((row, ri) => {
                if (!row.includes("|")) return null;
                const cells = row
                  .split("|")
                  .filter((_, ci, arr) => ci > 0 && ci < arr.length - 1);
                const Tag = ri === 0 ? "th" : "td";
                return (
                  <tr key={ri}>
                    {cells.map((cell, ci) => (
                      <Tag
                        key={ci}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #E5E7EB",
                          background:
                            ri === 0
                              ? `${color}10`
                              : ri % 2 === 0
                                ? "#F9FAFB"
                                : "#fff",
                          color: ri === 0 ? color : "#374151",
                          fontWeight: ri === 0 ? 700 : 400,
                          textAlign: "left",
                        }}
                      >
                        {cell.trim()}
                      </Tag>
                    ))}
                  </tr>
                );
              })}
          </table>
        </div>
      ) : (
        <div
          style={{
            fontSize: 14,
            lineHeight: 1.85,
            color: "#374151",
            whiteSpace: "pre-wrap",
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
}

// ─── Source Chunks Panel ──────────────────────────────────────────────────────
// Shows REAL chunk text, not IDs

function SourceChunks({
  chunks,
}: {
  chunks: { chunk_id: string; text: string; page_num?: number }[];
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  if (!chunks || chunks.length === 0) return null;

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      n.has(i) ? n.delete(i) : n.add(i);
      return n;
    });
  };

  return (
    <div style={{ marginTop: 20 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 800,
          color: "#9CA3AF",
          letterSpacing: 1,
          marginBottom: 10,
        }}
      >
        SOURCE PASSAGES ({chunks.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {chunks.map((chunk, i) => {
          const isOpen = expanded.has(i);
          const preview = chunk.text.slice(0, 180);
          return (
            <div
              key={chunk.chunk_id}
              style={{
                border: "1.5px solid #E8EDF5",
                borderRadius: 12,
                background: "#FAFBFF",
                overflow: "hidden",
              }}
            >
              <button
                onClick={() => toggle(i)}
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontFamily: "inherit",
                  textAlign: "left",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 6,
                    flexShrink: 0,
                    background: "linear-gradient(135deg, #6C63FF, #3ECFCF)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 900,
                    color: "#fff",
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 12,
                      color: "#374151",
                      lineHeight: 1.5,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: isOpen ? "normal" : "nowrap",
                    }}
                  >
                    {isOpen
                      ? ""
                      : preview + (chunk.text.length > 180 ? "…" : "")}
                  </div>
                  {chunk.page_num && (
                    <div
                      style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}
                    >
                      Page {chunk.page_num}
                    </div>
                  )}
                </div>
                <span style={{ fontSize: 12, color: "#9CA3AF", flexShrink: 0 }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </button>

              {isOpen && (
                <div
                  style={{
                    padding: "0 16px 16px",
                    fontSize: 13,
                    color: "#374151",
                    lineHeight: 1.8,
                    borderTop: "1px solid #F3F4F6",
                    paddingTop: 12,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {chunk.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Question Card ────────────────────────────────────────────────────────────

function QuestionCard({
  question,
  index,
  onSubmit,
  disabled,
}: {
  question: Question;
  index: number;
  onSubmit: (answer: string, q: Question, idx: number) => void;
  disabled: boolean;
}) {
  const [selected, setSelected] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const ans = ["mcq", "true_false"].includes(question.type)
      ? selected
      : textAnswer;
    if (!ans.trim()) return;
    setSubmitted(true);
    onSubmit(ans, question, index);
  };

  return (
    <div
      style={{
        background: "#fff",
        border: "1.5px solid #E8EDF5",
        borderRadius: 16,
        padding: "20px 24px",
        marginTop: 14,
        boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          marginBottom: 14,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            flexShrink: 0,
            background: "linear-gradient(135deg, #6C63FF, #3ECFCF)",
            color: "#fff",
            fontWeight: 900,
            fontSize: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          Q{index + 1}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#1A1D2E",
              lineHeight: 1.6,
            }}
          >
            {question.question}
          </div>
          {question.concept_name && (
            <span
              style={{
                display: "inline-block",
                marginTop: 4,
                fontSize: 10,
                padding: "2px 8px",
                background: "#EEF2FF",
                color: "#6C63FF",
                borderRadius: 20,
                fontWeight: 700,
              }}
            >
              Tests: {question.concept_name}
            </span>
          )}
        </div>
      </div>

      {["mcq", "true_false"].includes(question.type) && question.options && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginBottom: 14,
          }}
        >
          {question.options.map((opt, oi) => {
            const isSel = selected === opt;
            const isCorrect = submitted && opt === question.answer;
            const isWrong = submitted && isSel && opt !== question.answer;
            return (
              <button
                key={oi}
                disabled={disabled || submitted}
                onClick={() => setSelected(opt)}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontFamily: "inherit",
                  background: isCorrect
                    ? "#F0FDF4"
                    : isWrong
                      ? "#FEF2F2"
                      : isSel
                        ? "#EEF2FF"
                        : "#F9FAFB",
                  border: `1.5px solid ${isCorrect ? "#10B981" : isWrong ? "#EF4444" : isSel ? "#6C63FF" : "#E5E7EB"}`,
                  borderRadius: 10,
                  color: isCorrect
                    ? "#059669"
                    : isWrong
                      ? "#DC2626"
                      : isSel
                        ? "#6C63FF"
                        : "#374151",
                  cursor: disabled || submitted ? "default" : "pointer",
                  fontSize: 13,
                  fontWeight: isSel ? 700 : 400,
                  transition: "all 0.15s",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    flexShrink: 0,
                    border: `2px solid ${isCorrect ? "#10B981" : isWrong ? "#EF4444" : isSel ? "#6C63FF" : "#D1D5DB"}`,
                    background: isCorrect
                      ? "#10B981"
                      : isWrong
                        ? "#EF4444"
                        : isSel
                          ? "#6C63FF"
                          : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#fff",
                  }}
                >
                  {isCorrect && "✓"}
                  {isWrong && "✗"}
                </span>
                {opt}
              </button>
            );
          })}
        </div>
      )}

      {["short_answer", "fill_blank"].includes(question.type) && (
        <textarea
          value={textAnswer}
          onChange={(e) => setTextAnswer(e.target.value)}
          disabled={disabled || submitted}
          placeholder={
            question.type === "fill_blank"
              ? "Fill in the blank…"
              : "Type your answer here…"
          }
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "#F9FAFB",
            border: "1.5px solid #E5E7EB",
            borderRadius: 10,
            color: "#374151",
            fontSize: 13,
            fontFamily: "inherit",
            outline: "none",
            resize: "vertical",
            minHeight: 72,
            lineHeight: 1.6,
            marginBottom: 12,
            boxSizing: "border-box",
          }}
          onFocus={(e) =>
            ((e.target as HTMLTextAreaElement).style.borderColor = "#6C63FF")
          }
          onBlur={(e) =>
            ((e.target as HTMLTextAreaElement).style.borderColor = "#E5E7EB")
          }
        />
      )}

      {!submitted && (
        <button
          onClick={handleSubmit}
          disabled={
            disabled ||
            (["mcq", "true_false"].includes(question.type)
              ? !selected
              : !textAnswer.trim())
          }
          style={{
            padding: "9px 22px",
            background: "linear-gradient(135deg, #6C63FF, #3ECFCF)",
            border: "none",
            borderRadius: 10,
            color: "#fff",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 800,
            fontFamily: "inherit",
            opacity: disabled ? 0.6 : 1,
            transition: "opacity 0.15s",
            boxShadow: "0 3px 10px rgba(108,99,255,0.3)",
          }}
        >
          Submit
        </button>
      )}
    </div>
  );
}

// ─── Roadmap Mini DAG ─────────────────────────────────────────────────────────

function RoadmapMiniDAG({
  topics,
  dagEdges,
  activeTopic,
  onSelectTopic,
}: {
  topics: Topic[];
  dagEdges: DagEdge[];
  activeTopic: string | null;
  onSelectTopic: (id: string) => void;
}) {
  const { nodes, edges } = layoutDag(topics, dagEdges);
  if (!nodes.length)
    return (
      <div
        style={{
          padding: 40,
          textAlign: "center",
          color: "#9CA3AF",
          fontSize: 13,
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>🕸</div>No roadmap data
      </div>
    );

  const PAD = 40;
  const maxX = Math.max(...nodes.map((n) => n.x)) + NODE_W + PAD;
  const maxY = Math.max(...nodes.map((n) => n.y)) + NODE_H + PAD;
  const svgW = Math.max(maxX + PAD, 400);
  const svgH = Math.max(maxY + PAD, 260);
  const nodePos: Record<string, (typeof nodes)[0]> = {};
  nodes.forEach((n) => (nodePos[n.topic_id] = n));

  return (
    <div
      style={{
        overflowX: "auto",
        overflowY: "auto",
        maxHeight: 340,
        borderRadius: 12,
        border: "1px solid #E8EDF5",
      }}
    >
      <svg
        width={svgW}
        height={svgH}
        style={{ display: "block", background: "#FAFBFF" }}
      >
        <defs>
          <marker
            id="ra"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0,8 3,0 6" fill="#C7D2FE" />
          </marker>
          <marker
            id="raa"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0,8 3,0 6" fill="#6C63FF" />
          </marker>
        </defs>
        {edges.map((e, i) => {
          const f = nodePos[e.from_topic],
            t = nodePos[e.to_topic];
          if (!f || !t) return null;
          const act =
            activeTopic === e.from_topic || activeTopic === e.to_topic;
          const x1 = f.x + PAD + NODE_W / 2,
            y1 = f.y + PAD + NODE_H;
          const x2 = t.x + PAD + NODE_W / 2,
            y2 = t.y + PAD;
          return (
            <path
              key={i}
              d={`M ${x1} ${y1} C ${x1} ${y1 + 30},${x2} ${y2 - 30},${x2} ${y2}`}
              fill="none"
              stroke={act ? "#6C63FF" : "#C7D2FE"}
              strokeWidth={act ? 2 : 1}
              markerEnd={`url(#${act ? "raa" : "ra"})`}
            />
          );
        })}
        {nodes.map((node) => {
          const color = getClusterColor(node.cluster_id);
          const act = activeTopic === node.topic_id;
          const nx = node.x + PAD,
            ny = node.y + PAD;
          return (
            <g
              key={node.topic_id}
              style={{ cursor: "pointer" }}
              onClick={() => onSelectTopic(node.topic_id)}
            >
              {act && (
                <rect
                  x={nx - 4}
                  y={ny - 4}
                  width={NODE_W + 8}
                  height={NODE_H + 8}
                  rx={13}
                  fill={color}
                  opacity={0.15}
                />
              )}
              <rect
                x={nx}
                y={ny}
                width={NODE_W}
                height={NODE_H}
                rx={10}
                fill={act ? `${color}12` : "#fff"}
                stroke={act ? color : "#E8EDF5"}
                strokeWidth={act ? 2.5 : 1.5}
              />
              <rect
                x={nx}
                y={ny}
                width={NODE_W}
                height={4}
                rx={3}
                fill={color}
                opacity={0.8}
              />
              <text
                x={nx + NODE_W / 2}
                y={ny + NODE_H / 2 + 6}
                textAnchor="middle"
                fill={act ? "#1A1D2E" : "#4B5563"}
                fontSize={10}
                fontFamily="system-ui"
                fontWeight={act ? "800" : "500"}
              >
                {node.label.length > 16
                  ? node.label.slice(0, 14) + "…"
                  : node.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── Main StudyScreen ─────────────────────────────────────────────────────────

interface StudyScreenProps {
  userId: string;
  sourcePdf: string;
  subject?: string;
  onExit: () => void;
  topics?: Topic[];
  dagEdges?: DagEdge[];
}

export default function StudyScreen({
  userId,
  sourcePdf,
  subject = "GATE CSE",
  onExit,
  topics = [],
  dagEdges = [],
}: StudyScreenProps) {
  const [activeSection, setActiveSection] = useState<
    "content" | "video" | "roadmap" | "doubts"
  >("content");

  // Session + concepts
  const [session, setSession] = useState<SessionState | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState<string | null>(null);

  // Active concept + explanation
  const [activeConcept, setActiveConcept] = useState<Concept | null>(null);
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [explainError, setExplainError] = useState<string | null>(null);

  // Answer results
  const [answerResults, setAnswerResults] = useState<
    Record<
      number,
      {
        is_correct: boolean;
        score: number;
        feedback: string;
        mastery_score: number;
        remark: string;
      }
    >
  >({});
  const [answerLoading, setAnswerLoading] = useState<Record<number, boolean>>(
    {},
  );

  // Doubts
  const [doubt, setDoubt] = useState("");
  const [doubts, setDoubts] = useState<{ q: string; a: string }[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [activeTopic, setActiveTopic] = useState<string | null>(
    topics[0]?.topic_id ?? null,
  );
  const videoRef = useRef<HTMLVideoElement>(null);

  // ── Start session ──────────────────────────────────────────────────────────
  const startSession = useCallback(async () => {
    setSessionLoading(true);
    setSessionError(null);
    try {
      const res = await fetch(`${API}/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          source_pdf: sourcePdf,
          subject,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Session start failed: ${res.status}`);
      }
      const data: SessionState = await res.json();
      setSession(data);

      // Auto-load first unmastered concept
      const first = data.next_concept ?? data.concepts[0] ?? null;
      if (first) {
        setActiveConcept(first);
        loadExplanation(data.session_id, first);
      }
    } catch (e) {
      setSessionError(
        e instanceof Error ? e.message : "Failed to start session",
      );
    } finally {
      setSessionLoading(false);
    }
  }, [userId, sourcePdf, subject]);

  useEffect(() => {
    startSession();
  }, [startSession]);

  // ── Load concept explanation ───────────────────────────────────────────────
  const loadExplanation = async (sessionId: string, concept: Concept) => {
    setExplainLoading(true);
    setExplainError(null);
    setExplanation(null);
    setAnswerResults({});
    setAnswerLoading({});
    try {
      const res = await fetch(`${API}/session/concept/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: sessionId,
          user_id: userId,
          concept_id: concept.concept_id,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Explain failed: ${res.status}`);
      }
      const data: ExplainResponse = await res.json();
      setExplanation(data);
    } catch (e) {
      setExplainError(
        e instanceof Error ? e.message : "Failed to load explanation",
      );
    } finally {
      setExplainLoading(false);
    }
  };

  const handleSelectConcept = (concept: Concept) => {
    if (!session) return;
    setActiveConcept(concept);
    loadExplanation(session.session_id, concept);
    setActiveSection("content");
  };

  // ── Submit answer ──────────────────────────────────────────────────────────
  const handleAnswerSubmit = async (
    answer: string,
    question: Question,
    qIndex: number,
  ) => {
    if (!session || !activeConcept) return;
    setAnswerLoading((prev) => ({ ...prev, [qIndex]: true }));
    try {
      const res = await fetch(`${API}/session/concept/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          user_id: userId,
          concept_id: activeConcept.concept_id,
          concept_name: activeConcept.name,
          cluster_id: activeConcept.cluster_id,
          question_index: qIndex,
          student_answer: answer,
          question,
        }),
      });
      if (!res.ok) throw new Error(`Answer scoring failed: ${res.status}`);
      const data = await res.json();
      setAnswerResults((prev) => ({
        ...prev,
        [qIndex]: {
          is_correct: data.is_correct,
          score: data.score,
          feedback: data.feedback,
          mastery_score: data.mastery_score,
          remark: data.remark,
        },
      }));
      // Update mastery in session
      if (data.concept_scores) {
        setSession((prev) =>
          prev
            ? {
                ...prev,
                concept_mastery: data.concept_scores.map((cs: any) => ({
                  concept_id: cs.concept_id,
                  concept_name: cs.concept_name,
                  mastery_score: cs.mastery_score,
                  attempts: 0,
                  correct: 0,
                })),
              }
            : prev,
        );
      }
      // Auto-advance after mastery
      if (
        data.is_mastered &&
        data.next_concept &&
        data.next_concept.concept_id !== activeConcept.concept_id
      ) {
        setTimeout(() => {
          setActiveConcept(data.next_concept);
          loadExplanation(session.session_id, data.next_concept);
        }, 3500);
      }
    } catch (e) {
      console.error("Answer error:", e);
    } finally {
      setAnswerLoading((prev) => ({ ...prev, [qIndex]: false }));
    }
  };

  // ── Ask doubt ──────────────────────────────────────────────────────────────
  const handleAskDoubt = async () => {
    if (!doubt.trim() || !session || !activeConcept) return;
    const q = doubt;
    setDoubt("");
    setIsAsking(true);
    // Reload explanation as "answer" for the doubt
    try {
      const res = await fetch(`${API}/session/concept/explain`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: session.session_id,
          user_id: userId,
          concept_id: activeConcept.concept_id,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDoubts((prev) => [
          ...prev,
          {
            q,
            a: data.explanation || "Please refer to the explanation above.",
          },
        ]);
      } else {
        setDoubts((prev) => [
          ...prev,
          { q, a: "Could not fetch answer. Please check the Content tab." },
        ]);
      }
    } catch {
      setDoubts((prev) => [
        ...prev,
        { q, a: "Backend error — please try again." },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const masteryMap = Object.fromEntries(
    (session?.concept_mastery ?? []).map((m) => [
      m.concept_id,
      m.mastery_score,
    ]),
  );
  const masteredCount = (session?.concept_mastery ?? []).filter(
    (m) => m.mastery_score >= 0.7,
  ).length;
  const totalConcepts = session?.concepts.length ?? 0;
  const masteryPct =
    totalConcepts > 0 ? Math.round((masteredCount / totalConcepts) * 100) : 0;
  const xp = masteredCount * 25 + Math.round(masteryPct * 3);
  const { level, name: levelName, progress } = getLevel(xp);
  const streak = 5;

  const sections = [
    { key: "content" as const, label: "📖 Content" },
    { key: "video" as const, label: "🎬 Video" },
    { key: "roadmap" as const, label: "🗺 Roadmap" },
    { key: "doubts" as const, label: "💬 Doubts" },
  ];

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg,#F7F9FF 0%,#EEF2FF 60%,#F0FDF9 100%)",
        fontFamily: "'Inter',system-ui,sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg);}}`}</style>

      {/* ─ Header ─ */}
      <header
        style={{
          height: 60,
          padding: "0 28px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid #E8EDF5",
          position: "sticky",
          top: 0,
          zIndex: 100,
          boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={onExit}
            style={{
              background: "transparent",
              border: "1px solid #E0E7F0",
              borderRadius: 8,
              color: "#6B7280",
              cursor: "pointer",
              fontSize: 12,
              fontFamily: "inherit",
              padding: "6px 14px",
              fontWeight: 600,
            }}
          >
            ← Exit
          </button>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1D2E" }}>
              {subject} — Study Mode
            </div>
            <div style={{ fontSize: 10, color: "#9CA3AF" }}>
              {sourcePdf.length > 50 ? sourcePdf.slice(0, 47) + "…" : sourcePdf}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: "linear-gradient(135deg,#FEF3C7,#FDE68A)",
              border: "1.5px solid #FCD34D",
              borderRadius: 12,
              padding: "6px 14px",
            }}
          >
            <span style={{ fontSize: 18 }}>🔥</span>
            <div>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#D97706",
                  lineHeight: 1,
                }}
              >
                {streak}
              </div>
              <div style={{ fontSize: 9, color: "#B45309", fontWeight: 700 }}>
                STREAK
              </div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "linear-gradient(135deg,#EEF2FF,#E0FDF4)",
              border: "1.5px solid #C7D2FE",
              borderRadius: 12,
              padding: "6px 14px",
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 900, color: "#6C63FF" }}>
              Lv.{level}
            </span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#1A1D2E" }}>
                {levelName}
              </div>
              <div
                style={{
                  width: 64,
                  height: 4,
                  background: "#E0E7F0",
                  borderRadius: 4,
                }}
              >
                <div
                  style={{
                    width: `${progress}%`,
                    height: "100%",
                    background: "linear-gradient(90deg,#6C63FF,#3ECFCF)",
                    borderRadius: 4,
                  }}
                />
              </div>
            </div>
            <span style={{ fontSize: 12, fontWeight: 800, color: "#6C63FF" }}>
              {xp} XP
            </span>
          </div>

          <div
            style={{
              background: "#F0FDF4",
              border: "1.5px solid #BBF7D0",
              borderRadius: 12,
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span style={{ fontSize: 16 }}>🧠</span>
            <div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#059669" }}>
                {masteredCount}/{totalConcepts}
              </div>
              <div style={{ fontSize: 9, color: "#6EE7B7", fontWeight: 700 }}>
                MASTERED
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ─ Body ─ */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Sidebar */}
        <aside
          style={{
            width: 268,
            background: "#fff",
            borderRight: "1px solid #E8EDF5",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          <div style={{ padding: "18px 16px 0" }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9CA3AF",
                letterSpacing: 1,
                marginBottom: 10,
              }}
            >
              YOUR MASTERY
            </div>

            {/* Ring */}
            <div
              style={{
                background: "linear-gradient(135deg,#EEF2FF,#F0FDF4)",
                borderRadius: 14,
                padding: 16,
                border: "1.5px solid #E8EDF5",
                display: "flex",
                alignItems: "center",
                gap: 14,
                marginBottom: 14,
              }}
            >
              <svg width={64} height={64}>
                <circle
                  cx={32}
                  cy={32}
                  r={24}
                  fill="none"
                  stroke="#E0E7F0"
                  strokeWidth={5}
                />
                <circle
                  cx={32}
                  cy={32}
                  r={24}
                  fill="none"
                  stroke="url(#mgr)"
                  strokeWidth={5}
                  strokeDasharray={`${(masteryPct / 100) * 2 * Math.PI * 24} ${2 * Math.PI * 24}`}
                  strokeLinecap="round"
                  transform="rotate(-90 32 32)"
                  style={{ transition: "stroke-dasharray 0.7s" }}
                />
                <defs>
                  <linearGradient id="mgr" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#6C63FF" />
                    <stop offset="100%" stopColor="#3ECFCF" />
                  </linearGradient>
                </defs>
                <text
                  x={32}
                  y={37}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight={900}
                  fill="#1A1D2E"
                >
                  {masteryPct}%
                </text>
              </svg>
              <div>
                <div
                  style={{ fontSize: 14, fontWeight: 800, color: "#1A1D2E" }}
                >
                  {masteredCount} Mastered
                </div>
                <div style={{ fontSize: 11, color: "#6B7280" }}>
                  of {totalConcepts} concepts
                </div>
                <div style={{ fontSize: 11, color: "#9CA3AF", marginTop: 4 }}>
                  🔥 {streak} day streak
                </div>
              </div>
            </div>

            {session && (
              <div
                style={{
                  padding: "10px 12px",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  borderRadius: 10,
                  marginBottom: 14,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    color: "#9CA3AF",
                    fontWeight: 700,
                    marginBottom: 4,
                  }}
                >
                  CURRENT CLUSTER
                </div>
                <div
                  style={{ fontSize: 13, fontWeight: 700, color: "#1A1D2E" }}
                >
                  {session.topic_label}
                </div>
                <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 2 }}>
                  Cluster {session.current_cluster} · {session.total_clusters}{" "}
                  total
                </div>
              </div>
            )}
          </div>

          {/* Concept list */}
          <div style={{ padding: "0 16px 16px", flex: 1 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: "#9CA3AF",
                letterSpacing: 1,
                marginBottom: 8,
              }}
            >
              CONCEPTS ({session?.concepts.length ?? 0})
            </div>

            {sessionLoading ? (
              <div
                style={{
                  textAlign: "center",
                  padding: "24px 0",
                  color: "#9CA3AF",
                  fontSize: 12,
                }}
              >
                Loading session…
              </div>
            ) : sessionError ? (
              <div
                style={{
                  padding: 12,
                  background: "#FEE2E2",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#DC2626",
                }}
              >
                {sessionError}
                <button
                  onClick={startSession}
                  style={{
                    display: "block",
                    marginTop: 8,
                    padding: "4px 12px",
                    background: "#EF4444",
                    border: "none",
                    borderRadius: 6,
                    color: "#fff",
                    cursor: "pointer",
                    fontSize: 11,
                    fontFamily: "inherit",
                  }}
                >
                  Retry
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {(session?.concepts ?? []).map((concept, i) => {
                  const ms = masteryMap[concept.concept_id] ?? 0;
                  const isMastered = ms >= 0.7;
                  const isActive =
                    activeConcept?.concept_id === concept.concept_id;
                  const color = getClusterColor(concept.cluster_id);
                  return (
                    <div
                      key={concept.concept_id}
                      onClick={() => handleSelectConcept(concept)}
                      style={{
                        padding: "9px 12px",
                        borderRadius: 10,
                        cursor: "pointer",
                        border: `1.5px solid ${isActive ? color : "#E8EDF5"}`,
                        background: isActive ? `${color}08` : "#FAFBFF",
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.borderColor = color;
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (
                            e.currentTarget as HTMLDivElement
                          ).style.borderColor = "#E8EDF5";
                      }}
                    >
                      <div
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 6,
                          flexShrink: 0,
                          background: isMastered
                            ? `${color}20`
                            : isActive
                              ? `${color}15`
                              : "#F3F4F6",
                          border: `1.5px solid ${isMastered ? color : "#E5E7EB"}`,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 800,
                        }}
                      >
                        {isMastered ? (
                          <span style={{ color }}>✓</span>
                        ) : (
                          <span style={{ color: "#9CA3AF" }}>{i + 1}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 12,
                            fontWeight: isActive ? 700 : 500,
                            color: isActive ? "#1A1D2E" : "#4B5563",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {concept.name}
                        </div>
                        <div
                          style={{
                            fontSize: 9,
                            color: "#9CA3AF",
                            marginTop: 1,
                            textTransform: "capitalize",
                          }}
                        >
                          {concept.concept_type}
                        </div>
                      </div>
                      {ms > 0 && (
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color:
                              ms >= 0.7
                                ? "#10B981"
                                : ms >= 0.4
                                  ? "#F59E0B"
                                  : "#EF4444",
                            background:
                              ms >= 0.7
                                ? "#F0FDF4"
                                : ms >= 0.4
                                  ? "#FFFBEB"
                                  : "#FEF2F2",
                            padding: "1px 6px",
                            borderRadius: 8,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {Math.round(ms * 100)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Main */}
        <main
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            overflowY: "auto",
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              borderBottom: "1px solid #E8EDF5",
              padding: "0 28px",
              gap: 4,
              position: "sticky",
              top: 0,
              zIndex: 10,
            }}
          >
            {sections.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                style={{
                  padding: "14px 18px",
                  background: "transparent",
                  border: "none",
                  borderBottom:
                    activeSection === key
                      ? "2.5px solid #6C63FF"
                      : "2.5px solid transparent",
                  color: activeSection === key ? "#6C63FF" : "#6B7280",
                  cursor: "pointer",
                  fontSize: 13,
                  fontFamily: "inherit",
                  fontWeight: activeSection === key ? 800 : 500,
                  marginBottom: -1,
                  transition: "color 0.15s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <div style={{ padding: 28, flex: 1 }}>
            {/* ── CONTENT ── */}
            {activeSection === "content" && (
              <div style={{ maxWidth: 860 }}>
                {explainLoading ? (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 18,
                      border: "1.5px solid #E8EDF5",
                      padding: "60px 40px",
                      textAlign: "center",
                      boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    }}
                  >
                    <div
                      style={{
                        position: "relative",
                        width: 56,
                        height: 56,
                        margin: "0 auto 20px",
                      }}
                    >
                      <div
                        style={{
                          width: 56,
                          height: 56,
                          border: "4px solid #E0E7F0",
                          borderTop: "4px solid #6C63FF",
                          borderRadius: "50%",
                          animation: "spin 0.9s linear infinite",
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          inset: 10,
                          border: "3px solid #E0FDF4",
                          borderBottom: "3px solid #3ECFCF",
                          borderRadius: "50%",
                          animation: "spin 1.3s linear infinite reverse",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: "#4B5563",
                        marginBottom: 8,
                      }}
                    >
                      Generating explanation for{" "}
                      <strong>{activeConcept?.name}</strong>…
                    </div>
                    <div style={{ fontSize: 12, color: "#9CA3AF" }}>
                      Groq is preparing your personalized teaching
                    </div>
                  </div>
                ) : explainError ? (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1.5px solid #FECACA",
                      borderRadius: 16,
                      padding: "20px 24px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        color: "#DC2626",
                        fontWeight: 600,
                        marginBottom: 10,
                      }}
                    >
                      ⚠ {explainError}
                    </div>
                    <button
                      onClick={() =>
                        activeConcept &&
                        session &&
                        loadExplanation(session.session_id, activeConcept)
                      }
                      style={{
                        padding: "8px 18px",
                        background: "#EF4444",
                        border: "none",
                        borderRadius: 8,
                        color: "#fff",
                        cursor: "pointer",
                        fontSize: 12,
                        fontFamily: "inherit",
                        fontWeight: 700,
                      }}
                    >
                      Retry
                    </button>
                  </div>
                ) : !explanation ? (
                  <div
                    style={{
                      background: "#fff",
                      borderRadius: 18,
                      border: "1.5px solid #E8EDF5",
                      padding: "60px 40px",
                      textAlign: "center",
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 12 }}>👈</div>
                    <div style={{ fontSize: 15, color: "#6B7280" }}>
                      Select a concept from the sidebar to begin
                    </div>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 20,
                    }}
                  >
                    {/* Concept card */}
                    <div
                      style={{
                        background: "#fff",
                        borderRadius: 18,
                        border: "1.5px solid #E8EDF5",
                        padding: "24px 28px",
                        boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                      }}
                    >
                      {/* Badges */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          marginBottom: 14,
                        }}
                      >
                        <span
                          style={{
                            fontSize: 11,
                            padding: "4px 12px",
                            background: `${getClusterColor(explanation.cluster_id)}12`,
                            border: `1.5px solid ${getClusterColor(explanation.cluster_id)}30`,
                            color: getClusterColor(explanation.cluster_id),
                            borderRadius: 20,
                            fontWeight: 700,
                          }}
                        >
                          {explanation.topic_label}
                        </span>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "3px 10px",
                            background: "#F3F4F6",
                            color: "#6B7280",
                            borderRadius: 20,
                            fontWeight: 600,
                            textTransform: "capitalize",
                          }}
                        >
                          {explanation.concept_type}
                        </span>
                        {activeConcept &&
                          (masteryMap[activeConcept.concept_id] ?? 0) >=
                            0.7 && (
                            <span
                              style={{
                                marginLeft: "auto",
                                fontSize: 11,
                                padding: "3px 12px",
                                background: "#F0FDF4",
                                color: "#059669",
                                borderRadius: 20,
                                fontWeight: 700,
                                border: "1px solid #BBF7D0",
                              }}
                            >
                              ✓ Mastered
                            </span>
                          )}
                      </div>

                      <h2
                        style={{
                          fontSize: 24,
                          fontWeight: 900,
                          color: "#1A1D2E",
                          margin: "0 0 14px",
                          letterSpacing: -0.5,
                        }}
                      >
                        {explanation.concept_name}
                      </h2>

                      {/* Definition */}
                      {explanation.definition_text && (
                        <div
                          style={{
                            background:
                              "linear-gradient(135deg,#EEF2FF,#F0FDF4)",
                            borderRadius: 10,
                            padding: "12px 16px",
                            fontSize: 14,
                            color: "#374151",
                            lineHeight: 1.75,
                            border: "1px solid #E0E7FF",
                            marginBottom: 16,
                            fontStyle: "italic",
                          }}
                        >
                          📌 {explanation.definition_text}
                        </div>
                      )}

                      {/* Key points */}
                      {explanation.key_points &&
                        explanation.key_points.length > 0 && (
                          <div style={{ marginBottom: 16 }}>
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 700,
                                color: "#9CA3AF",
                                letterSpacing: 1,
                                marginBottom: 8,
                              }}
                            >
                              KEY POINTS
                            </div>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 6,
                              }}
                            >
                              {explanation.key_points.map((pt, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    gap: 10,
                                    alignItems: "flex-start",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: 6,
                                      flexShrink: 0,
                                      background: "#EEF2FF",
                                      color: "#6C63FF",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 10,
                                      fontWeight: 800,
                                      marginTop: 2,
                                    }}
                                  >
                                    {i + 1}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 13,
                                      color: "#374151",
                                      lineHeight: 1.65,
                                    }}
                                  >
                                    {pt}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                      {/* LLM Explanation */}
                      {explanation.explanation && (
                        <div
                          style={{
                            fontSize: 14,
                            lineHeight: 1.9,
                            color: "#374151",
                            borderTop: "1px solid #F3F4F6",
                            paddingTop: 16,
                          }}
                        >
                          {explanation.explanation}
                        </div>
                      )}

                      {/* Teaching Aid */}
                      {explanation.aid_content &&
                        explanation.aid_type &&
                        explanation.aid_type !== "none" && (
                          <TeachingAid
                            type={explanation.aid_type}
                            content={explanation.aid_content}
                            label={explanation.aid_label}
                          />
                        )}

                      {/* XP card */}
                      <div
                        style={{
                          marginTop: 20,
                          padding: "14px 18px",
                          background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
                          border: "1.5px solid #FCD34D",
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <span style={{ fontSize: 24 }}>🏆</span>
                        <div>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 800,
                              color: "#92400E",
                            }}
                          >
                            Answer all questions correctly to earn +25 XP!
                          </div>
                          <div style={{ fontSize: 11, color: "#B45309" }}>
                            Mastery updates with EWA scoring after each answer
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Source passages */}
                    {explanation.source_chunks &&
                      explanation.source_chunks.length > 0 && (
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 18,
                            border: "1.5px solid #E8EDF5",
                            padding: "20px 24px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          }}
                        >
                          <SourceChunks chunks={explanation.source_chunks} />
                        </div>
                      )}

                    {/* Questions */}
                    {explanation.questions &&
                      explanation.questions.length > 0 && (
                        <div
                          style={{
                            background: "#fff",
                            borderRadius: 18,
                            border: "1.5px solid #E8EDF5",
                            padding: "20px 24px",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                          }}
                        >
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: "#1A1D2E",
                              marginBottom: 4,
                            }}
                          >
                            Practice Questions
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#6B7280",
                              marginBottom: 4,
                            }}
                          >
                            Answer these to update your mastery score via EWA
                          </div>

                          {explanation.questions.map((q, qi) => {
                            const result = answerResults[qi];
                            return (
                              <div key={qi}>
                                <QuestionCard
                                  question={q}
                                  index={qi}
                                  onSubmit={handleAnswerSubmit}
                                  disabled={answerLoading[qi] ?? false}
                                />
                                {result && (
                                  <div
                                    style={{
                                      marginTop: 8,
                                      padding: "12px 18px",
                                      background: result.is_correct
                                        ? "#F0FDF4"
                                        : "#FEF2F2",
                                      border: `1.5px solid ${result.is_correct ? "#BBF7D0" : "#FECACA"}`,
                                      borderRadius: 12,
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 8,
                                        marginBottom: 6,
                                      }}
                                    >
                                      <span style={{ fontSize: 16 }}>
                                        {result.is_correct ? "✅" : "❌"}
                                      </span>
                                      <span
                                        style={{
                                          fontSize: 13,
                                          fontWeight: 700,
                                          color: result.is_correct
                                            ? "#059669"
                                            : "#DC2626",
                                        }}
                                      >
                                        {result.is_correct
                                          ? `Correct! +${Math.round(result.score * 10)} XP`
                                          : "Incorrect"}
                                      </span>
                                      <span
                                        style={{
                                          marginLeft: "auto",
                                          fontSize: 11,
                                          fontWeight: 700,
                                          color:
                                            result.mastery_score >= 0.7
                                              ? "#10B981"
                                              : "#F59E0B",
                                          background:
                                            result.mastery_score >= 0.7
                                              ? "#F0FDF4"
                                              : "#FFFBEB",
                                          padding: "2px 8px",
                                          borderRadius: 12,
                                        }}
                                      >
                                        Mastery:{" "}
                                        {Math.round(result.mastery_score * 100)}
                                        %
                                      </span>
                                    </div>
                                    <div
                                      style={{
                                        fontSize: 13,
                                        color: "#4B5563",
                                        lineHeight: 1.65,
                                      }}
                                    >
                                      {result.feedback}
                                    </div>
                                    {result.remark && (
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "#6B7280",
                                          borderTop: "1px solid #E5E7EB",
                                          paddingTop: 8,
                                          marginTop: 6,
                                          fontStyle: "italic",
                                        }}
                                      >
                                        💬 {result.remark}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                    {explanation.prev_remark && (
                      <div
                        style={{
                          padding: "12px 16px",
                          background: "#F0F9FF",
                          border: "1px solid #BAE6FD",
                          borderRadius: 10,
                          fontSize: 12,
                          color: "#0369A1",
                          fontStyle: "italic",
                        }}
                      >
                        💬 Previous session: {explanation.prev_remark}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ── VIDEO ── */}
            {activeSection === "video" && (
              <div style={{ maxWidth: 860 }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    border: "1.5px solid #E8EDF5",
                    overflow: "hidden",
                    boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      background: "#0F0F14",
                      aspectRatio: "16/9",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <video
                      ref={videoRef}
                      src="/video.mp4"
                      controls
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "contain",
                      }}
                    />
                  </div>
                  <div style={{ padding: "18px 22px" }}>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#1A1D2E",
                        marginBottom: 4,
                      }}
                    >
                      {activeConcept?.name ?? subject} — Lecture Video
                    </div>
                    <div style={{ fontSize: 12, color: "#6B7280" }}>
                      Watch the lecture, then test yourself in the Content tab.
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    padding: "16px 20px",
                    background: "#F0FDF4",
                    border: "1.5px solid #BBF7D0",
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span style={{ fontSize: 28 }}>🎬</span>
                  <div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        color: "#065F46",
                      }}
                    >
                      Watch full video to unlock +15 XP
                    </div>
                    <div style={{ fontSize: 11, color: "#6EE7B7" }}>
                      Progress tracked automatically
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── ROADMAP ── */}
            {activeSection === "roadmap" && (
              <div style={{ maxWidth: 860 }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    border: "1.5px solid #E8EDF5",
                    padding: 24,
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <span style={{ fontSize: 24 }}>🗺</span>
                    <div>
                      <div
                        style={{
                          fontSize: 17,
                          fontWeight: 800,
                          color: "#1A1D2E",
                        }}
                      >
                        Knowledge Roadmap
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        Click any node to study that topic. Arrows =
                        prerequisites.
                      </div>
                    </div>
                  </div>
                  {topics.length > 0 ? (
                    <RoadmapMiniDAG
                      topics={topics}
                      dagEdges={dagEdges}
                      activeTopic={activeTopic}
                      onSelectTopic={(id) => {
                        setActiveTopic(id);
                        setActiveSection("content");
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        textAlign: "center",
                        padding: 40,
                        color: "#9CA3AF",
                      }}
                    >
                      <div style={{ fontSize: 36, marginBottom: 8 }}>🕸</div>No
                      roadmap data
                    </div>
                  )}
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(4,1fr)",
                    gap: 12,
                  }}
                >
                  {[
                    { icon: "🌱", label: "Beginner", t: 25, c: "#10B981" },
                    { icon: "📚", label: "Learner", t: 50, c: "#3B82F6" },
                    { icon: "⚡", label: "Scholar", t: 75, c: "#8B5CF6" },
                    { icon: "🏆", label: "Master", t: 100, c: "#F59E0B" },
                  ].map(({ icon, label, t, c }) => {
                    const achieved = masteryPct >= t;
                    return (
                      <div
                        key={label}
                        style={{
                          padding: 16,
                          textAlign: "center",
                          background: achieved ? `${c}08` : "#F9FAFB",
                          border: `1.5px solid ${achieved ? c + "40" : "#E5E7EB"}`,
                          borderRadius: 14,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 26,
                            marginBottom: 6,
                            opacity: achieved ? 1 : 0.3,
                          }}
                        >
                          {icon}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 800,
                            color: achieved ? c : "#9CA3AF",
                          }}
                        >
                          {label}
                        </div>
                        <div
                          style={{
                            fontSize: 10,
                            color: achieved ? `${c}99` : "#D1D5DB",
                            marginTop: 2,
                          }}
                        >
                          {t}%
                        </div>
                        {achieved && (
                          <div
                            style={{
                              fontSize: 10,
                              color: c,
                              fontWeight: 700,
                              marginTop: 4,
                            }}
                          >
                            ✓ Achieved
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── DOUBTS ── */}
            {activeSection === "doubts" && (
              <div
                style={{
                  maxWidth: 760,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div
                  style={{
                    background: "#fff",
                    borderRadius: 18,
                    border: "1.5px solid #E8EDF5",
                    padding: "20px 24px",
                    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#1A1D2E",
                      marginBottom: 6,
                    }}
                  >
                    💬 Ask a Doubt
                  </div>
                  <div
                    style={{ fontSize: 12, color: "#6B7280", marginBottom: 16 }}
                  >
                    Ask anything about{" "}
                    <strong>{activeConcept?.name ?? subject}</strong>. Each
                    answered doubt earns +5 XP!
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <textarea
                      value={doubt}
                      onChange={(e) => setDoubt(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleAskDoubt();
                        }
                      }}
                      placeholder="e.g. What is the difference between process and algorithm?"
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background: "#F9FAFB",
                        border: "1.5px solid #E5E7EB",
                        borderRadius: 10,
                        color: "#374151",
                        fontSize: 13,
                        fontFamily: "inherit",
                        outline: "none",
                        resize: "none",
                        height: 80,
                        lineHeight: 1.6,
                        boxSizing: "border-box",
                        transition: "border-color 0.15s",
                      }}
                      onFocus={(e) =>
                        ((e.target as HTMLTextAreaElement).style.borderColor =
                          "#6C63FF")
                      }
                      onBlur={(e) =>
                        ((e.target as HTMLTextAreaElement).style.borderColor =
                          "#E5E7EB")
                      }
                    />
                    <button
                      onClick={handleAskDoubt}
                      disabled={isAsking || !doubt.trim()}
                      style={{
                        padding: "0 22px",
                        background:
                          isAsking || !doubt.trim()
                            ? "#F3F4F6"
                            : "linear-gradient(135deg,#6C63FF,#3ECFCF)",
                        border: "none",
                        borderRadius: 10,
                        color: isAsking || !doubt.trim() ? "#9CA3AF" : "#fff",
                        cursor:
                          isAsking || !doubt.trim() ? "not-allowed" : "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        fontFamily: "inherit",
                        alignSelf: "stretch",
                        transition: "all 0.15s",
                      }}
                    >
                      {isAsking ? "…" : "Ask"}
                    </button>
                  </div>
                </div>

                {doubts.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#9CA3AF",
                    }}
                  >
                    <div style={{ fontSize: 40, marginBottom: 10 }}>💡</div>
                    <div style={{ fontSize: 14 }}>
                      No doubts yet — ask your first question!
                    </div>
                  </div>
                ) : (
                  doubts
                    .slice()
                    .reverse()
                    .map((d, i) => (
                      <div
                        key={i}
                        style={{
                          background: "#fff",
                          borderRadius: 16,
                          border: "1.5px solid #E8EDF5",
                          overflow: "hidden",
                          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                        }}
                      >
                        <div
                          style={{
                            padding: "12px 18px",
                            background: "#F9FAFB",
                            borderBottom: "1px solid #F3F4F6",
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#6C63FF",
                              marginTop: 1,
                            }}
                          >
                            Q
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#374151",
                              fontWeight: 600,
                              flex: 1,
                            }}
                          >
                            {d.q}
                          </span>
                          <span
                            style={{
                              fontSize: 10,
                              background: "#EEF2FF",
                              color: "#6C63FF",
                              padding: "2px 8px",
                              borderRadius: 20,
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                            }}
                          >
                            +5 XP
                          </span>
                        </div>
                        <div
                          style={{
                            padding: "12px 18px",
                            display: "flex",
                            gap: 8,
                            alignItems: "flex-start",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#059669",
                              marginTop: 1,
                            }}
                          >
                            A
                          </span>
                          <span
                            style={{
                              fontSize: 13,
                              color: "#374151",
                              lineHeight: 1.8,
                              flex: 1,
                            }}
                          >
                            {d.a}
                          </span>
                        </div>
                      </div>
                    ))
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      <footer
        style={{
          padding: "8px 32px",
          borderTop: "1px solid #E8EDF5",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#D1D5DB",
          background: "#fff",
          fontWeight: 500,
        }}
      >
        <span>GATE CSE ADAPTIVE TUTOR · STUDY SESSION</span>
        <span>FastEmbed · Groq Llama-3.1-8b · Supabase pgvector</span>
      </footer>
    </div>
  );
}
