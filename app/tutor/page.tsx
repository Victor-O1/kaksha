"use client";

import { useState, useRef, useCallback, useEffect } from "react";
// import { useSession } from "next-auth/react";
import Header from "@/components/Header";
import LibraryScreen from "@/components/LibraryScreen";
import ExportBar from "@/components/Exportbar";
import ClustersTab from "@/components/Clusterstab";
import ChunksTab from "@/components/Chunkstab";
import { TopicsTab } from "@/components/Topicstab";
import DagVisualizer from "@/components/Dagvisualiser";
import SearchTab from "@/components/Searchtab";
import StudyScreen from "@/components/StudyScreen";

import type { PipelineData, SearchResult, LibraryEntry } from "@/types";
import { API, masteryToXP } from "@/lib/utils";

// ─── Tab definitions ──────────────────────────────────────────────────────────

type TabKey = "clusters" | "chunks" | "topics" | "dag" | "search";

const TABS: { key: TabKey; label: string; icon: string; color: string }[] = [
  { key: "clusters", label: "Clusters", icon: "🗂", color: "#F59E0B" },
  { key: "chunks", label: "Chunks", icon: "📄", color: "#10B981" },
  { key: "topics", label: "Topics", icon: "🧠", color: "#3B82F6" },
  { key: "dag", label: "Prereq Graph", icon: "🕸", color: "#EF4444" },
  { key: "search", label: "Search", icon: "🔍", color: "#6C63FF" },
];

// ─── Loading overlay ──────────────────────────────────────────────────────────

function LoadingOverlay({ message }: { message: string }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 24,
        background:
          "linear-gradient(160deg, #F7F9FF 0%, #EEF2FF 50%, #F0FDF9 100%)",
      }}
    >
      <div style={{ position: "relative", width: 72, height: 72 }}>
        <div
          style={{
            width: 72,
            height: 72,
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
            border: "4px solid #E0FDF4",
            borderBottom: "4px solid #3ECFCF",
            borderRadius: "50%",
            animation: "spin 1.3s linear infinite reverse",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 14,
          color: "#4B5563",
          maxWidth: 380,
          textAlign: "center",
          lineHeight: 1.7,
          fontWeight: 500,
        }}
      >
        {message}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "#9CA3AF",
          background: "#fff",
          padding: "6px 14px",
          borderRadius: 20,
          border: "1px solid #E5E7EB",
        }}
      >
        Watch your terminal for step-by-step logs
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Error screen ─────────────────────────────────────────────────────────────

function ErrorScreen({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 20,
        background:
          "linear-gradient(160deg, #FFF7F7 0%, #FEE2E2 50%, #FFF7F7 100%)",
      }}
    >
      <div style={{ fontSize: 48 }}>😓</div>
      <div
        style={{
          color: "#DC2626",
          fontSize: 14,
          maxWidth: 400,
          textAlign: "center",
          background: "#FEE2E2",
          border: "1.5px solid #FECACA",
          borderRadius: 12,
          padding: "16px 24px",
          fontWeight: 500,
        }}
      >
        {message}
      </div>
      <button
        onClick={onRetry}
        style={{
          padding: "10px 24px",
          background: "linear-gradient(135deg, #6C63FF, #3ECFCF)",
          border: "none",
          borderRadius: 10,
          color: "#fff",
          cursor: "pointer",
          fontSize: 13,
          fontFamily: "inherit",
          fontWeight: 700,
          boxShadow: "0 4px 14px rgba(108,99,255,0.35)",
        }}
      >
        Try Again
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GateTutorPage() {
  // const { data: authSession } = useSession();
  // const userId =
  //   (authSession?.user as { id?: string })?.id ??
  //   authSession?.user?.email ??
  //   "anonymous";
  const userId = "anonymous";
  const [studyMode, setStudyMode] = useState(false);
  const [studyPdf, setStudyPdf] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<TabKey>("clusters");
  const [selectedCluster, setSelectedCluster] = useState<number | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentXP = pipelineData
    ? library.find((e) => e.source_pdf === pipelineData.source_pdf)?.mastery
      ? masteryToXP(
          library.find((e) => e.source_pdf === pipelineData.source_pdf)!
            .mastery,
        )
      : 0
    : 0;

  // ─── Load library ──────────────────────────────────────────────────────────

  const loadLibrary = useCallback(async (uid?: string) => {
    setLibraryLoading(true);
    try {
      const qs = uid ? `?user_id=${encodeURIComponent(uid)}` : "";
      const res = await fetch(`${API}/library${qs}`);
      if (res.ok) setLibrary((await res.json()).pdfs || []);
    } catch {
      /* backend not ready */
    } finally {
      setLibraryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibrary(userId !== "anonymous" ? userId : undefined);
  }, [userId, loadLibrary]);

  // ─── Load PDF from library ─────────────────────────────────────────────────

  const loadPdf = useCallback(async (sourcePdf: string) => {
    setPipelineData(null);
    setSearchResult(null);
    setUploadProgress("Loading…");
    try {
      const res = await fetch(`${API}/data/${encodeURIComponent(sourcePdf)}`);
      if (!res.ok) throw new Error("Not found");
      const data: PipelineData = await res.json();
      const topicLabelMap: Record<string, string> = {};
      data.topics.forEach((t) => (topicLabelMap[t.topic_id] = t.label));
      data.dag_edges = (data.dag_edges || []).map((e) => ({
        ...e,
        from_label: e.from_label || topicLabelMap[e.from_topic] || "",
        to_label: e.to_label || topicLabelMap[e.to_topic] || "",
      }));
      setPipelineData(data);
      setStudyPdf(data.source_pdf);
      setActiveTab("clusters");
      setUploadProgress("");
    } catch (e: unknown) {
      setUploadProgress(`Error: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // ─── Upload PDF ────────────────────────────────────────────────────────────

  const handleUpload = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".pdf")) {
        alert("Only PDF files are accepted.");
        return;
      }
      setIsUploading(true);
      setUploadProgress("Reading PDF…");
      setPipelineData(null);
      setSearchResult(null);
      const formData = new FormData();
      formData.append("file", file);
      try {
        setUploadProgress(
          "Running pipeline — chunking → embedding → clustering → topics → DAG (2–5 min)…",
        );
        const res = await fetch(`${API}/upload-pdf`, {
          method: "POST",
          body: formData,
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.detail || "Upload failed");
        }
        const data: PipelineData = await res.json();
        const topicLabelMap: Record<string, string> = {};
        data.topics.forEach((t) => (topicLabelMap[t.topic_id] = t.label));
        data.dag_edges = (data.dag_edges || []).map((e) => ({
          ...e,
          from_label: e.from_label || topicLabelMap[e.from_topic] || "",
          to_label: e.to_label || topicLabelMap[e.to_topic] || "",
        }));
        setPipelineData(data);
        setStudyPdf(data.source_pdf);
        setUploadProgress("");
        setActiveTab("clusters");
        loadLibrary(userId !== "anonymous" ? userId : undefined);
      } catch (err: unknown) {
        setUploadProgress(
          `Error: ${err instanceof Error ? err.message : String(err)}`,
        );
      } finally {
        setIsUploading(false);
      }
    },
    [loadLibrary, userId],
  );

  // ─── Search ────────────────────────────────────────────────────────────────

  const handleSearch = useCallback(async () => {
    if (!query.trim() || !pipelineData) return;
    setIsSearching(true);
    setSearchResult(null);
    try {
      const res = await fetch(`${API}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query,
          source_pdf: pipelineData.source_pdf,
          top_k: 6,
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      setSearchResult(await res.json());
      setActiveTab("search");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  }, [query, pipelineData]);

  // ─── Derived ───────────────────────────────────────────────────────────────

  const displayedChunks =
    selectedCluster !== null
      ? (pipelineData?.chunks ?? []).filter(
          (c) => c.cluster_id === selectedCluster,
        )
      : (pipelineData?.chunks ?? []);

  // ─── Study mode ────────────────────────────────────────────────────────────

  if (studyMode) {
    const pdf = studyPdf || pipelineData?.source_pdf || "";
    return (
      <StudyScreen
        userId={userId || "anonymous"}
        sourcePdf={pdf}
        subject="Software Engineering"
        onExit={() => setStudyMode(false)}
        topics={pipelineData?.topics ?? []}
        dagEdges={pipelineData?.dag_edges ?? []}
      />
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(160deg, #F7F9FF 0%, #EEF2FF 50%, #F0FDF9 100%)",
        color: "#1A1D2E",
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <Header
        pipelineData={pipelineData}
        onClearPipeline={() => {
          setPipelineData(null);
          setSearchResult(null);
          setUploadProgress("");
        }}
        onStudy={() => {
          setStudyPdf(pipelineData?.source_pdf ?? null);
          setStudyMode(true);
        }}
        xp={currentXP}
      />

      {/* Library screen */}
      {!pipelineData && !isUploading && !uploadProgress.startsWith("Error") && (
        <LibraryScreen
          library={library}
          libraryLoading={libraryLoading}
          onLoadPdf={loadPdf}
          onStudy={(pdf) => {
            setStudyPdf(pdf);
            setStudyMode(true);
          }}
          onUpload={handleUpload}
          fileInputRef={fileInputRef as React.RefObject<HTMLInputElement>}
        />
      )}

      {/* Loading */}
      {isUploading && <LoadingOverlay message={uploadProgress} />}

      {/* Error */}
      {!isUploading && uploadProgress.startsWith("Error") && (
        <ErrorScreen
          message={uploadProgress}
          onRetry={() => {
            setUploadProgress("");
            fileInputRef.current?.click();
          }}
        />
      )}

      {/* Hidden file input for error screen retry */}
      {uploadProgress.startsWith("Error") && (
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
      )}

      {/* Data explorer view */}
      {pipelineData && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
            background: "#F7F9FF",
          }}
        >
          {/* Search bar */}
          <div
            style={{
              padding: "14px 32px",
              borderBottom: "1px solid #E8EDF5",
              display: "flex",
              gap: 10,
              alignItems: "center",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
            }}
          >
            <div style={{ position: "relative", flex: 1 }}>
              <span
                style={{
                  position: "absolute",
                  left: 12,
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontSize: 15,
                  color: "#9CA3AF",
                  pointerEvents: "none",
                }}
              >
                🔍
              </span>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search concepts… e.g. 'binary tree traversal'"
                style={{
                  width: "100%",
                  padding: "10px 14px 10px 38px",
                  background: "#F9FAFB",
                  border: "1.5px solid #E5E7EB",
                  borderRadius: 10,
                  color: "#374151",
                  fontSize: 13,
                  fontFamily: "inherit",
                  outline: "none",
                  transition: "border-color 0.15s, box-shadow 0.15s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#6C63FF";
                  (e.target as HTMLInputElement).style.boxShadow =
                    "0 0 0 3px rgba(108,99,255,0.1)";
                }}
                onBlur={(e) => {
                  (e.target as HTMLInputElement).style.borderColor = "#E5E7EB";
                  (e.target as HTMLInputElement).style.boxShadow = "none";
                }}
              />
            </div>
            <button
              onClick={handleSearch}
              disabled={isSearching || !query.trim()}
              style={{
                padding: "10px 22px",
                background: isSearching
                  ? "#F3F4F6"
                  : "linear-gradient(135deg, #6C63FF, #3ECFCF)",
                border: "none",
                borderRadius: 10,
                color: isSearching ? "#9CA3AF" : "#fff",
                cursor: isSearching ? "not-allowed" : "pointer",
                fontSize: 13,
                fontWeight: 700,
                fontFamily: "inherit",
                boxShadow: isSearching
                  ? "none"
                  : "0 3px 12px rgba(108,99,255,0.3)",
                transition: "all 0.15s",
                whiteSpace: "nowrap",
              }}
            >
              {isSearching ? "Searching…" : "Search"}
            </button>

            <button
              onClick={() => {
                setPipelineData(null);
                setSearchResult(null);
                setUploadProgress("");
              }}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "1.5px solid #E5E7EB",
                borderRadius: 10,
                color: "#6B7280",
                cursor: "pointer",
                fontSize: 12,
                fontFamily: "inherit",
                fontWeight: 600,
                transition: "all 0.15s",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#6C63FF";
                (e.currentTarget as HTMLButtonElement).style.color = "#6C63FF";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.borderColor =
                  "#E5E7EB";
                (e.currentTarget as HTMLButtonElement).style.color = "#6B7280";
              }}
            >
              New PDF
            </button>
          </div>

          {/* Export bar */}
          <ExportBar pipelineData={pipelineData} />

          {/* Tabs */}
          <div
            style={{
              display: "flex",
              borderBottom: "1px solid #E8EDF5",
              background: "rgba(255,255,255,0.85)",
              backdropFilter: "blur(8px)",
              padding: "0 32px",
              gap: 4,
            }}
          >
            {TABS.map(({ key, label, icon, color }) => {
              let count: number | undefined;
              if (key === "clusters") count = pipelineData.clusters.length;
              else if (key === "chunks") count = displayedChunks.length;
              else if (key === "topics") count = pipelineData.topics.length;
              else if (key === "dag") count = pipelineData.dag_edges.length;
              else if (key === "search") count = searchResult?.chunks.length;

              return (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  style={{
                    padding: "13px 18px",
                    background: "transparent",
                    border: "none",
                    borderBottom:
                      activeTab === key
                        ? `2.5px solid ${color}`
                        : "2.5px solid transparent",
                    color: activeTab === key ? color : "#6B7280",
                    cursor: "pointer",
                    fontSize: 13,
                    fontFamily: "inherit",
                    fontWeight: activeTab === key ? 700 : 500,
                    marginBottom: -1,
                    transition: "color 0.15s",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    whiteSpace: "nowrap",
                  }}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {count !== undefined && (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "1px 7px",
                        background:
                          activeTab === key ? `${color}15` : "#F3F4F6",
                        color: activeTab === key ? color : "#9CA3AF",
                        borderRadius: 20,
                        fontWeight: 700,
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: "auto", padding: "24px 32px" }}>
            {activeTab === "clusters" && (
              <ClustersTab
                clusters={pipelineData.clusters}
                selectedCluster={selectedCluster}
                onSelectCluster={(id) => {
                  setSelectedCluster(id);
                  setActiveTab("chunks");
                }}
                onStudyCluster={() => {
                  setStudyPdf(pipelineData.source_pdf);
                  setStudyMode(true);
                }}
              />
            )}
            {activeTab === "chunks" && (
              <ChunksTab
                chunks={displayedChunks}
                selectedCluster={selectedCluster}
                onClearCluster={() => setSelectedCluster(null)}
              />
            )}
            {activeTab === "topics" && (
              <TopicsTab topics={pipelineData.topics} />
            )}
            {activeTab === "dag" && (
              <div>
                <div style={{ marginBottom: 20 }}>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#1A1D2E",
                      marginBottom: 6,
                    }}
                  >
                    🕸 Prerequisite Graph
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "#6B7280",
                      lineHeight: 1.6,
                      maxWidth: 680,
                    }}
                  >
                    Built from textbook page order. A → B means "understand A
                    before B". Nodes are colored by cluster, edges show
                    prerequisite relationships pruned by Groq.
                  </div>
                </div>
                <DagVisualizer
                  topics={pipelineData.topics}
                  dagEdges={pipelineData.dag_edges}
                />
              </div>
            )}
            {activeTab === "search" && (
              <SearchTab searchResult={searchResult} />
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer
        style={{
          padding: "8px 32px",
          borderTop: "1px solid #E8EDF5",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 10,
          color: "#D1D5DB",
          background: "rgba(255,255,255,0.8)",
          fontWeight: 500,
        }}
      >
        <span>ADAPTIVE TUTOR · v0.1</span>
        <span>FastEmbed · Groq Llama-3.1-8b · Supabase pgvector</span>
      </footer>
    </div>
  );
}
