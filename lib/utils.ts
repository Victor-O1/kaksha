import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Constants & Utilities ────────────────────────────────────────────────────

export const API = "http://localhost:8000";

export const NODE_W = 160;
export const NODE_H = 52;
export const H_GAP = 200;
export const V_GAP = 100;

// Pastel-meets-vibrant palette for light theme
export const CLUSTER_COLORS = [
  "#E85D75", // rose
  "#F4845F", // coral
  "#F7B731", // amber
  "#20BF6B", // emerald
  "#0FB9B1", // teal
  "#45AAF2", // sky
  "#A55EEA", // violet
  "#FC5C65", // red
  "#26DE81", // mint
  "#FD9644", // orange
  "#4B7BEC", // blue
  "#D1D8E0", // silver
  "#778CA3", // slate
  "#2BCBBA", // cyan
  "#8854D0", // purple
  "#EB3B5A", // crimson
  "#3867D6", // indigo
  "#0A3D62", // navy
  "#B8E994", // lime
  "#F8EFBA", // cream
];

export function getClusterColor(id: number | null): string {
  if (id === null) return "#B2BEC3";
  return CLUSTER_COLORS[id % CLUSTER_COLORS.length];
}

// XP / gamification helpers
export const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1500, 2500];
export const LEVEL_NAMES = [
  "Novice",
  "Learner",
  "Scholar",
  "Expert",
  "Master",
  "Legend",
  "Grandmaster",
];

export function getLevel(xp: number): {
  level: number;
  name: string;
  progress: number;
  nextXP: number;
} {
  let level = 0;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      level = i;
      break;
    }
  }
  const nextXP = LEVEL_THRESHOLDS[level + 1] ?? LEVEL_THRESHOLDS[level];
  const progress =
    nextXP > LEVEL_THRESHOLDS[level]
      ? ((xp - LEVEL_THRESHOLDS[level]) / (nextXP - LEVEL_THRESHOLDS[level])) *
        100
      : 100;
  return { level, name: LEVEL_NAMES[level] ?? "Grandmaster", progress, nextXP };
}

export function masteryToXP(mastery: {
  overall_score: number;
  sessions: number;
  mastered: number;
}): number {
  return Math.round(
    mastery.overall_score * 500 + mastery.sessions * 20 + mastery.mastered * 15,
  );
}

// DAG layout
import type { DagNode, Topic, DagEdge } from "@/types/index";

export function layoutDag(
  topics: Topic[],
  edges: DagEdge[],
): { nodes: DagNode[]; edges: DagEdge[] } {
  if (!topics.length) return { nodes: [], edges: [] };

  const topicMap: Record<string, Topic> = {};
  topics.forEach((t) => (topicMap[t.topic_id] = t));

  const inDegree: Record<string, number> = {};
  const children: Record<string, string[]> = {};
  topics.forEach((t) => {
    inDegree[t.topic_id] = 0;
    children[t.topic_id] = [];
  });
  edges.forEach((e) => {
    if (topicMap[e.from_topic] && topicMap[e.to_topic]) {
      children[e.from_topic].push(e.to_topic);
      inDegree[e.to_topic] = (inDegree[e.to_topic] || 0) + 1;
    }
  });

  const level: Record<string, number> = {};
  const queue = topics
    .filter((t) => inDegree[t.topic_id] === 0)
    .map((t) => t.topic_id);
  queue.forEach((id) => (level[id] = 0));

  while (queue.length) {
    const cur = queue.shift()!;
    (children[cur] || []).forEach((nxt) => {
      level[nxt] = Math.max(level[nxt] ?? 0, (level[cur] ?? 0) + 1);
      inDegree[nxt]--;
      if (inDegree[nxt] === 0) queue.push(nxt);
    });
  }

  topics.forEach((t) => {
    if (level[t.topic_id] === undefined) level[t.topic_id] = 0;
  });

  const byLevel: Record<number, string[]> = {};
  topics.forEach((t) => {
    const l = level[t.topic_id];
    if (!byLevel[l]) byLevel[l] = [];
    byLevel[l].push(t.topic_id);
  });

  const nodes: DagNode[] = [];
  Object.entries(byLevel).forEach(([lvl, ids]) => {
    const l = Number(lvl);
    ids.forEach((id, i) => {
      const t = topicMap[id];
      nodes.push({
        topic_id: id,
        label: t.label,
        cluster_id: t.cluster_id,
        level: l,
        x: i * H_GAP,
        y: l * V_GAP,
      });
    });
  });

  const maxWidth =
    Math.max(...Object.values(byLevel).map((ids) => ids.length)) * H_GAP;
  nodes.forEach((n) => {
    const rowWidth = byLevel[n.level].length * H_GAP;
    n.x += (maxWidth - rowWidth) / 2;
  });

  return { nodes, edges };
}

// Export helpers
export function downloadJSON(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
