"use client";

/**
 * MermaidDiagram — production-safe renderer for Kaksha
 *
 * Strategy (3-layer defence):
 *  1. Load Mermaid 11 from CDN (avoids Next.js SSR/npm version issues)
 *  2. Auto-sanitize common LLM syntax mistakes before rendering
 *  3. On any failure → render a clean styled flowchart built from the raw text,
 *     so the demo NEVER shows a broken/empty box
 */

import { useState, useEffect, useRef, useId } from "react";

// ─── Sanitizer ────────────────────────────────────────────────────────────────
// Fixes the most common mistakes LLMs make in Mermaid syntax

function sanitizeMermaid(raw: string): string {
  let s = raw.trim();

  // Strip markdown code fences
  s = s
    .replace(/^```mermaid\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  s = s
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  // Ensure a valid diagram type header
  const hasHeader =
    /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|gitGraph)\b/i.test(
      s,
    );
  if (!hasHeader) s = "graph TD\n" + s;

  // Replace invalid arrow types: --> with --> is fine, ->> with -->
  s = s.replace(/->>>/g, "-->>");
  // Fix double-arrow >>  that aren't valid
  s = s.replace(/([A-Za-z0-9\])}])-->>([A-Za-z0-9\[({])/g, "$1-->$2");

  // Remove lines that are just style declarations with # hex — sometimes breaks parser
  // Keep them but ensure hex values are quoted if needed
  s = s.replace(/fill:#([0-9a-fA-F]{3,6})\b/g, "fill:#$1");

  // Remove any trailing semicolons after node IDs which confuse the parser
  s = s.replace(/;(\s*\n)/g, "\n");

  // Collapse multiple blank lines
  s = s.replace(/\n{3,}/g, "\n\n");

  return s;
}

// ─── Parse raw mermaid text into a simple node/edge model for fallback UI ─────

interface ParsedNode {
  id: string;
  label: string;
}
interface ParsedEdge {
  from: string;
  to: string;
  label?: string;
}
interface ParsedGraph {
  nodes: ParsedNode[];
  edges: ParsedEdge[];
  title?: string;
}

function parseForFallback(raw: string): ParsedGraph {
  const lines = raw
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const nodes: ParsedNode[] = [];
  const edges: ParsedEdge[] = [];
  const nodeSet = new Set<string>();
  let title: string | undefined;

  // Extract title if present
  const titleLine = lines.find((l) => l.toLowerCase().startsWith("title"));
  if (titleLine) title = titleLine.replace(/^title\s*/i, "").trim();

  for (const line of lines) {
    // Skip header lines
    if (
      /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|mindmap|gitGraph|title|style|classDef|subgraph|end)\b/i.test(
        line,
      )
    )
      continue;
    if (line.startsWith("%%")) continue;

    // Edge with label: A-->|label|B  or A-- label -->B
    const edgeLabelMatch = line.match(
      /^([A-Za-z0-9_]+)(?:\[.*?\])?\s*(?:-->|-->>|->|==>|-.->)\s*\|([^|]+)\|\s*([A-Za-z0-9_]+)(?:\[.*?\])?/,
    );
    if (edgeLabelMatch) {
      const [, from, label, to] = edgeLabelMatch;
      edges.push({ from, to, label });
      [from, to].forEach((id) => nodeSet.add(id));
      continue;
    }

    // Edge without label: A-->B  A->>B  A==>B  A-.->B  A-->B
    const edgeMatch = line.match(
      /^([A-Za-z0-9_]+)(?:\[.*?\])?\s*(?:-->|-->>|->|==>|-.->|--)\s*([A-Za-z0-9_]+)(?:\[.*?\])?/,
    );
    if (edgeMatch) {
      const [, from, to] = edgeMatch;
      edges.push({ from, to });
      [from, to].forEach((id) => nodeSet.add(id));
      continue;
    }

    // Node definition: A[Label text]  A(Label)  A{Label}  A([Label])
    const nodeMatch = line.match(/^([A-Za-z0-9_]+)[\[({]([^\]})]+)[\]})]/);
    if (nodeMatch) {
      const [, id, label] = nodeMatch;
      if (!nodes.find((n) => n.id === id)) {
        nodes.push({ id, label });
        nodeSet.add(id);
      }
      continue;
    }
  }

  // Add any referenced nodes that weren't explicitly declared
  for (const id of nodeSet) {
    if (!nodes.find((n) => n.id === id)) {
      // Try to extract label from node definitions in original
      const labelMatch = raw.match(
        new RegExp(id + "[\\[({]([^\\]})]+)[\\]})]"),
      );
      nodes.push({ id, label: labelMatch ? labelMatch[1] : id });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  const dedupedNodes = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  return { nodes: dedupedNodes, edges, title };
}

// ─── Fallback visual renderer ─────────────────────────────────────────────────
// Renders a clean, styled flowchart using SVG — never blank, always informative

function FallbackDiagram({ raw, color }: { raw: string; color: string }) {
  const { nodes, edges, title } = parseForFallback(raw);

  if (nodes.length === 0) {
    // Last resort: render as a clean code block
    return (
      <div
        style={{
          background: "#F8F6F1",
          borderRadius: 10,
          border: "1px solid #E4DDD2",
          padding: "14px 18px",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          fontSize: 12,
          color: "#4A4840",
          lineHeight: 1.8,
          whiteSpace: "pre-wrap",
          overflowX: "auto",
        }}
      >
        {raw}
      </div>
    );
  }

  // Layout: simple vertical chain with branching support
  const NODE_W = 160;
  const NODE_H = 40;
  const H_GAP = 56;
  const V_GAP = 64;

  // Assign levels (BFS from roots)
  const inDegree: Record<string, number> = {};
  nodes.forEach((n) => (inDegree[n.id] = 0));
  edges.forEach((e) => {
    inDegree[e.to] = (inDegree[e.to] || 0) + 1;
  });
  const roots = nodes.filter((n) => !inDegree[n.id]).map((n) => n.id);
  if (!roots.length) roots.push(nodes[0].id);

  const level: Record<string, number> = {};
  const queue = [...roots];
  roots.forEach((r) => (level[r] = 0));
  while (queue.length) {
    const cur = queue.shift()!;
    edges
      .filter((e) => e.from === cur)
      .forEach((e) => {
        if (level[e.to] === undefined) {
          level[e.to] = (level[cur] || 0) + 1;
          queue.push(e.to);
        }
      });
  }
  nodes.forEach((n) => {
    if (level[n.id] === undefined) level[n.id] = 0;
  });

  // Group by level
  const byLevel: Record<number, string[]> = {};
  nodes.forEach((n) => {
    const lv = level[n.id] ?? 0;
    if (!byLevel[lv]) byLevel[lv] = [];
    byLevel[lv].push(n.id);
  });
  const maxLevel = Math.max(...Object.keys(byLevel).map(Number));
  const maxPerLevel = Math.max(...Object.values(byLevel).map((a) => a.length));

  const pos: Record<string, { x: number; y: number }> = {};
  Object.entries(byLevel).forEach(([lv, ids]) => {
    const lvNum = Number(lv);
    const totalW = ids.length * NODE_W + (ids.length - 1) * H_GAP;
    const startX = (maxPerLevel * (NODE_W + H_GAP) - totalW) / 2;
    ids.forEach((id, i) => {
      pos[id] = {
        x: startX + i * (NODE_W + H_GAP),
        y: lvNum * (NODE_H + V_GAP) + 20,
      };
    });
  });

  const svgW = Math.max(maxPerLevel * (NODE_W + H_GAP) + 40, 400);
  const svgH = (maxLevel + 1) * (NODE_H + V_GAP) + 60;

  // Node color by position
  const nodeColors = [color, "#2D6AC4", "#2A7A4B", "#7C3D8A", "#B8860B"];

  return (
    <div
      style={{
        overflowX: "auto",
        borderRadius: 12,
        background: "#FAFAF8",
        padding: "8px 0",
      }}
    >
      {title && (
        <div
          style={{
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            color,
            marginBottom: 4,
            letterSpacing: 0.5,
            textTransform: "uppercase",
            opacity: 0.8,
            fontFamily: "'DM Sans', system-ui, sans-serif",
          }}
        >
          {title}
        </div>
      )}
      <svg
        width={svgW}
        height={svgH}
        style={{ display: "block", margin: "0 auto" }}
      >
        <defs>
          <marker
            id="fb-arrow"
            markerWidth="8"
            markerHeight="6"
            refX="7"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill={color} opacity="0.7" />
          </marker>
        </defs>

        {/* Edges */}
        {edges.map((edge, i) => {
          const from = pos[edge.from];
          const to = pos[edge.to];
          if (!from || !to) return null;
          const x1 = from.x + NODE_W / 2;
          const y1 = from.y + NODE_H;
          const x2 = to.x + NODE_W / 2;
          const y2 = to.y;
          const midY = (y1 + y2) / 2;
          return (
            <g key={i}>
              <path
                d={`M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeOpacity={0.5}
                markerEnd="url(#fb-arrow)"
              />
              {edge.label && (
                <text
                  x={(x1 + x2) / 2}
                  y={midY}
                  textAnchor="middle"
                  fill={color}
                  fontSize={10}
                  fontFamily="system-ui"
                  opacity={0.75}
                  style={{ pointerEvents: "none" }}
                >
                  {edge.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Nodes */}
        {nodes.map((node, i) => {
          const p = pos[node.id];
          if (!p) return null;
          const nc = nodeColors[level[node.id] % nodeColors.length];
          // Truncate label
          const displayLabel =
            node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label;
          return (
            <g key={node.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={9}
                fill={`${nc}10`}
                stroke={`${nc}50`}
                strokeWidth={1.5}
              />
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={4}
                rx={4}
                fill={nc}
                opacity={0.8}
              />
              <text
                x={p.x + NODE_W / 2}
                y={p.y + NODE_H / 2 + 6}
                textAnchor="middle"
                fill={nc}
                fontSize={11}
                fontFamily="'DM Sans', system-ui, sans-serif"
                fontWeight="600"
              >
                {displayLabel}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ─── CDN loader ───────────────────────────────────────────────────────────────

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

function loadMermaidFromCDN(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("SSR"));
      return;
    }
    if (window._mermaidLoaded && window.mermaid) {
      resolve();
      return;
    }

    // Queue callbacks while loading
    if (window._mermaidLoading) {
      window._mermaidCallbacks = window._mermaidCallbacks || [];
      window._mermaidCallbacks.push(() => resolve());
      return;
    }

    window._mermaidLoading = true;
    window._mermaidCallbacks = [];

    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.min.js";
    script.async = true;
    script.onload = () => {
      window._mermaidLoaded = true;
      window._mermaidLoading = false;
      window.mermaid?.initialize({
        startOnLoad: false,
        theme: "default",
        securityLevel: "loose",
        fontFamily: "'DM Sans', system-ui, sans-serif",
      });
      // Flush queue
      window._mermaidCallbacks?.forEach((cb) => cb());
      window._mermaidCallbacks = [];
      resolve();
    };
    script.onerror = () => {
      window._mermaidLoading = false;
      reject(new Error("CDN load failed"));
    };
    document.head.appendChild(script);
  });
}

// ─── Main component ───────────────────────────────────────────────────────────

interface MermaidDiagramProps {
  code: string;
  /** Color accent for fallback diagram (matches TeachingAid color) */
  accentColor?: string;
}

type RenderState = "loading" | "success" | "fallback";

export default function MermaidDiagram({
  code,
  accentColor = "#C4622D",
}: MermaidDiagramProps) {
  const [state, setState] = useState<RenderState>("loading");
  const [svg, setSvg] = useState<string>("");
  const uid = useId().replace(/:/g, "");
  const attemptRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const attempt = ++attemptRef.current;

    async function tryRender(rawCode: string): Promise<string> {
      await loadMermaidFromCDN();
      if (!window.mermaid) throw new Error("mermaid not available");
      const id = `mmd_${uid}_${attempt}_${Date.now()}`;
      // Remove any stale elements
      document.getElementById(id)?.remove();
      const { svg: rendered } = await window.mermaid.render(id, rawCode);
      return rendered;
    }

    async function run() {
      const clean = sanitizeMermaid(code);

      // Attempt 1: sanitized code
      try {
        const rendered = await tryRender(clean);
        if (!cancelled && attempt === attemptRef.current) {
          setSvg(rendered);
          setState("success");
        }
        return;
      } catch (_err1) {
        // Attempt 2: simplified version (strip style/class lines which often cause errors)
        const simplified = clean
          .split("\n")
          .filter(
            (l) =>
              !l.trim().startsWith("style ") &&
              !l.trim().startsWith("classDef ") &&
              !l.trim().startsWith("class "),
          )
          .join("\n");
        try {
          const rendered = await tryRender(simplified);
          if (!cancelled && attempt === attemptRef.current) {
            setSvg(rendered);
            setState("success");
          }
          return;
        } catch (_err2) {
          // Fall through to visual fallback
          if (!cancelled && attempt === attemptRef.current) {
            setState("fallback");
          }
        }
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [code, uid]);

  if (state === "loading") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "16px 20px",
          background: "#F8F6F1",
          borderRadius: 10,
          border: "1px solid #E4DDD2",
          fontSize: 12,
          color: "#8A8275",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            border: `2px solid #E4DDD2`,
            borderTop: `2px solid ${accentColor}`,
            animation: "mmdSpin 0.8s linear infinite",
            flexShrink: 0,
          }}
        />
        <style>{`@keyframes mmdSpin { to { transform: rotate(360deg); } }`}</style>
        Rendering diagram…
      </div>
    );
  }

  if (state === "success") {
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
  }

  // state === "fallback" — show our own rendered diagram
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 8,
          fontSize: 10,
          color: "#B0A89E",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <span>📊</span>
        <span style={{ fontWeight: 600 }}>Diagram (fallback renderer)</span>
      </div>
      <FallbackDiagram raw={sanitizeMermaid(code)} color={accentColor} />
    </div>
  );
}
