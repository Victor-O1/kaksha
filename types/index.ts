// ─── Shared Types ─────────────────────────────────────────────────────────────

export interface Chunk {
  chunk_id: string;
  text: string;
  cluster_id: number | null;
  page_num: number;
  token_count: number;
  similarity?: number;
}

export interface Topic {
  topic_id: string;
  label: string;
  cluster_id: number;
  core_chunk_id: string;
  supporting_chunk_ids: string[];
}

export interface ClusterSummary {
  cluster_id: number;
  chunk_count: number;
  label: string | null;
}

export interface DagEdge {
  edge_id?: number;
  from_topic: string;
  to_topic: string;
  evidence: string;
  cosine_similarity: number;
  from_label?: string;
  to_label?: string;
}

export interface PipelineData {
  chunks: Chunk[];
  topics: Topic[];
  clusters: ClusterSummary[];
  dag_edges: DagEdge[];
  source_pdf: string;
  pipeline_summary?: {
    total_chunks: number;
    total_clusters: number;
    total_topics: number;
    total_dag_edges: number;
  };
}

export interface SearchResult {
  query: string;
  chunks: Chunk[];
  clusters: { cluster_id: number; topic_id: string; label: string }[];
}

export interface LibraryCluster {
  cluster_id: number;
  label: string | null;
  chunk_count: number;
  concept_count: number;
}

export interface LibraryEntry {
  source_pdf: string;
  chunk_count: number;
  cluster_count: number;
  topic_count: number;
  concept_count: number;
  clusters: LibraryCluster[];
  mastery: {
    total_concepts: number;
    mastered: number;
    overall_score: number;
    sessions: number;
    session_id?: string;
    session_status?: string;
  };
}

export interface DagNode {
  topic_id: string;
  label: string;
  cluster_id: number;
  x: number;
  y: number;
  level: number;
}
