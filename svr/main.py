
import os
import re
import uuid
import time
import json as _json
from typing import List, Optional, Dict
from datetime import datetime

import numpy as np
import fitz  # PyMuPDF
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from fastembed import TextEmbedding
from supabase import create_client, Client
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "your_groq_api_key_here")
SUPABASE_URL = os.getenv("SUPABASE_URL", "https://your-project.supabase.co")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "your_supabase_anon_or_service_key")

CHUNK_SIZE        = 400       # target tokens per chunk
CHUNK_MIN_TOKENS  = 50
FASTEMBED_MODEL   = "BAAI/bge-small-en-v1.5"
EMBED_DIM         = 384
GROQ_MODEL        = "llama-3.1-8b-instant"

# DAG: connect topics if cosine similarity > threshold
DAG_SIM_THRESHOLD = 0.35

# Mastery
MASTERY_THRESHOLD = 0.70
EWA_ALPHA         = 0.4      # NewScore = α * current + (1-α) * previous

print("=" * 55)
print("[BOOT] GATE CSE Tutor (Simplified) Starting...")
print(f"[BOOT] Embed : {FASTEMBED_MODEL}")
print(f"[BOOT] LLM   : {GROQ_MODEL}")
print("=" * 55)

# ─────────────────────────────────────────────
# INIT
# ─────────────────────────────────────────────
app = FastAPI(title="GATE CSE Tutor API (Simple)", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

print("[EMBED] Loading FastEmbed model...")
embed_model = TextEmbedding(model_name=FASTEMBED_MODEL)
print("[EMBED] ✓ Ready")

llm = ChatGroq(api_key=GROQ_API_KEY, model=GROQ_MODEL, temperature=0.2, max_tokens=200)
llm_long = ChatGroq(api_key=GROQ_API_KEY, model=GROQ_MODEL, temperature=0.2, max_tokens=4000)
print(f"[LLM] ✓ Groq ready: {GROQ_MODEL}")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
print(f"[DB] ✓ Supabase connected")


# ─────────────────────────────────────────────
# DB SETUP SQL (print on startup)
# ─────────────────────────────────────────────
SETUP_SQL = f"""
-- Run ONCE in Supabase SQL Editor
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunks (
    chunk_id    TEXT PRIMARY KEY,
    source_pdf  TEXT NOT NULL,
    text        TEXT NOT NULL,
    token_count INT,
    page_num    INT,
    embedding   vector({EMBED_DIM}),
    cluster_id  INT,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS topic_nodes (
    topic_id             TEXT PRIMARY KEY,
    label                TEXT NOT NULL,
    cluster_id           INT,
    core_chunk_id        TEXT,
    supporting_chunk_ids TEXT[],
    source_pdf           TEXT,
    created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS dag_edges (
    edge_id           BIGSERIAL PRIMARY KEY,
    from_topic        TEXT,
    to_topic          TEXT,
    evidence          TEXT,
    cosine_similarity FLOAT,
    source_pdf        TEXT,
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cluster_concepts (
    concept_id       TEXT PRIMARY KEY,
    cluster_id       INT NOT NULL,
    source_pdf       TEXT NOT NULL,
    concept_index    INT NOT NULL DEFAULT 0,
    name             TEXT NOT NULL,
    concept_type     TEXT NOT NULL,
    definition_text  TEXT,
    key_points       JSONB DEFAULT '[]',
    source_chunk_ids JSONB DEFAULT '[]',
    created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_sessions (
    session_id       TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    source_pdf       TEXT NOT NULL,
    subject          TEXT NOT NULL DEFAULT 'general',
    current_cluster  INT NOT NULL DEFAULT 0,
    status           TEXT NOT NULL DEFAULT 'active',
    created_at       TIMESTAMPTZ DEFAULT NOW(),
    updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunk_mastery (
    id            BIGSERIAL PRIMARY KEY,
    session_id    TEXT NOT NULL,
    user_id       TEXT NOT NULL,
    chunk_id      TEXT NOT NULL,
    cluster_id    INT,
    source_pdf    TEXT NOT NULL,
    mastery_score FLOAT NOT NULL DEFAULT 0.0,
    attempts      INT NOT NULL DEFAULT 0,
    correct       INT NOT NULL DEFAULT 0,
    remark        TEXT,
    last_seen     TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, chunk_id)
);

CREATE TABLE IF NOT EXISTS concept_mastery (
    id               BIGSERIAL PRIMARY KEY,
    session_id       TEXT NOT NULL,
    user_id          TEXT NOT NULL,
    concept_id       TEXT NOT NULL,
    concept_name     TEXT NOT NULL,
    concept_type     TEXT,
    cluster_id       INT,
    source_pdf       TEXT NOT NULL,
    mastery_score    FLOAT NOT NULL DEFAULT 0.0,
    attempts         INT NOT NULL DEFAULT 0,
    correct          INT NOT NULL DEFAULT 0,
    remark           TEXT,
    last_chunk_id    TEXT,
    last_seen        TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(session_id, concept_id)
);

CREATE TABLE IF NOT EXISTS cluster_mastery (
    id              BIGSERIAL PRIMARY KEY,
    session_id      TEXT NOT NULL,
    user_id         TEXT NOT NULL,
    cluster_id      INT NOT NULL,
    source_pdf      TEXT NOT NULL,
    mastery_score   FLOAT NOT NULL DEFAULT 0.0,
    chunks_total    INT NOT NULL DEFAULT 0,
    chunks_mastered INT NOT NULL DEFAULT 0,
    remark          TEXT,
    completed_at    TIMESTAMPTZ,
    UNIQUE(session_id, cluster_id)
);

CREATE TABLE IF NOT EXISTS session_events (
    id          BIGSERIAL PRIMARY KEY,
    session_id  TEXT NOT NULL,
    user_id     TEXT NOT NULL,
    event_type  TEXT NOT NULL,
    chunk_id    TEXT,
    cluster_id  INT,
    payload     JSONB,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Required for similarity search
CREATE OR REPLACE FUNCTION match_chunks(
    query_embedding   vector({EMBED_DIM}),
    match_source_pdf  TEXT,
    match_count       INT DEFAULT 5
)
RETURNS TABLE (
    chunk_id    TEXT,
    text        TEXT,
    cluster_id  INT,
    page_num    INT,
    token_count INT,
    similarity  FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
    RETURN QUERY
    SELECT c.chunk_id, c.text, c.cluster_id, c.page_num, c.token_count,
           1 - (c.embedding <=> query_embedding) AS similarity
    FROM chunks c
    WHERE c.source_pdf = match_source_pdf
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
"""


# ─────────────────────────────────────────────
# LAYER 1: CHUNKING
# ─────────────────────────────────────────────
def count_tokens(text: str) -> int:
    return int(len(text.split()) * 1.3)

def extract_and_chunk_pdf(pdf_bytes: bytes, source_name: str) -> List[Dict]:
    """PDF bytes → fixed-size text chunks by page blocks."""
    print(f"\n[CHUNK] Extracting: {source_name}")
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")

    chunks = []
    buffer = ""
    buffer_page = 1

    for page_num, page in enumerate(doc, 1):
        text = page.get_text("text").strip()
        if not text:
            continue
        for block in re.split(r'\n{2,}', text):
            block = block.strip()
            if not block:
                continue
            buffer = (buffer + " " + block).strip()
            buffer_page = page_num
            if count_tokens(buffer) >= CHUNK_SIZE:
                if count_tokens(buffer) >= CHUNK_MIN_TOKENS:
                    chunks.append({
                        "chunk_id":    f"chunk_{uuid.uuid4().hex[:12]}",
                        "text":        re.sub(r'\s+', ' ', buffer),
                        "token_count": count_tokens(buffer),
                        "page_num":    buffer_page,
                        "source_pdf":  source_name,
                    })
                buffer = ""

    # flush
    if buffer.strip() and count_tokens(buffer) >= CHUNK_MIN_TOKENS:
        chunks.append({
            "chunk_id":    f"chunk_{uuid.uuid4().hex[:12]}",
            "text":        re.sub(r'\s+', ' ', buffer),
            "token_count": count_tokens(buffer),
            "page_num":    buffer_page,
            "source_pdf":  source_name,
        })

    print(f"[CHUNK] ✓ {len(chunks)} chunks extracted")
    return chunks


# ─────────────────────────────────────────────
# LAYER 2: EMBEDDING
# ─────────────────────────────────────────────
def embed_chunks(chunks: List[Dict]) -> List[Dict]:
    """Embed all chunks locally with FastEmbed."""
    print(f"[EMBED] Embedding {len(chunks)} chunks...")
    texts = [c["text"] for c in chunks]
    embeddings = list(embed_model.embed(texts))
    for i, chunk in enumerate(chunks):
        emb = embeddings[i]
        chunk["embedding"] = emb.tolist() if hasattr(emb, "tolist") else list(emb)
    print(f"[EMBED] ✓ Done")
    return chunks

def embed_query(query: str) -> List[float]:
    result = list(embed_model.embed([query]))[0]
    return result.tolist() if hasattr(result, "tolist") else list(result)

def cosine_similarity(a: List[float], b: List[float]) -> float:
    va, vb = np.array(a), np.array(b)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    if denom == 0:
        return 0.0
    return float(np.dot(va, vb) / denom)


# ─────────────────────────────────────────────
# LAYER 3: CONCEPT EXTRACTION (per chunk via LLM)
# ─────────────────────────────────────────────
def extract_concepts_from_chunk(chunk: Dict) -> List[Dict]:
    """
    Read one chunk → ask LLM to pull out 2-4 concepts.
    Simple, direct — one LLM call per chunk.
    """
    system = SystemMessage(content=(
        "You are a GATE CSE curriculum designer. "
        "Read the textbook chunk and extract 2-4 key concepts.\n\n"
        "Respond ONLY with a JSON array. No preamble. No fences.\n"
        "Format:\n"
        "[\n"
        "  {\n"
        '    "name": "concept name",\n'
        '    "concept_type": "definition|process|list|comparison|formula",\n'
        '    "definition_text": "one sentence",\n'
        '    "key_points": ["point 1", "point 2", "point 3"]\n'
        "  }\n"
        "]"
    ))
    human = HumanMessage(content=f"Chunk:\n{chunk['text'][:2000]}\n\nExtract concepts as JSON:")

    try:
        response = llm_long.invoke([system, human])
        raw = response.content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw).strip()
        parsed = _json.loads(raw)
        if not isinstance(parsed, list):
            parsed = parsed.get("concepts", [])
        return parsed[:4]
    except Exception as e:
        print(f"[CONCEPT] ✗ chunk {chunk['chunk_id'][:16]}: {e}")
        return []


def group_chunks_into_clusters(chunks: List[Dict]) -> Dict[int, List[Dict]]:
    """
    Simple grouping: consecutive chunks of ~5 form one cluster (topic group).
    No KMeans — just sliding window grouping.
    """
    CLUSTER_SIZE = max(3, len(chunks) // 20)  # ~20 clusters target
    cluster_map: Dict[int, List[Dict]] = {}
    for i, chunk in enumerate(chunks):
        cid = i // CLUSTER_SIZE
        chunk["cluster_id"] = cid
        cluster_map.setdefault(cid, []).append(chunk)
    print(f"[CLUSTER] ✓ {len(cluster_map)} clusters (window size={CLUSTER_SIZE})")
    return cluster_map


def extract_topic_label(cluster_chunks: List[Dict]) -> str:
    """Ask LLM for a 2-4 word topic label from the first few chunks."""
    previews = "\n".join(f"- {c['text'][:150]}" for c in cluster_chunks[:3])
    system = SystemMessage(content=(
        "You are a CS professor. Given textbook snippets, reply with ONLY a 2-4 word topic label. "
        "No explanation. No quotes."
    ))
    human = HumanMessage(content=f"Snippets:\n{previews}\n\nTopic:")
    try:
        response = llm.invoke([system, human])
        return response.content.strip().strip('"').strip("'")
    except Exception:
        return f"Topic_{cluster_chunks[0]['cluster_id']}"


# ─────────────────────────────────────────────
# LAYER 4: DAG — cosine similarity between topic embeddings
# ─────────────────────────────────────────────
def build_dag(topic_nodes: List[Dict], chunks: List[Dict], source_pdf: str) -> List[Dict]:
    """
    Build prerequisite DAG using pairwise cosine similarity between
    the mean embedding of each cluster's chunks.
    If similarity > DAG_SIM_THRESHOLD → add a directed edge (earlier cluster → later cluster).
    """
    print(f"\n[DAG] Building DAG | topics={len(topic_nodes)} | threshold={DAG_SIM_THRESHOLD}")

    # Build cluster_id → mean embedding
    cluster_embs: Dict[int, List[float]] = {}
    cluster_chunks_map: Dict[int, List] = {}
    for c in chunks:
        cid = c.get("cluster_id")
        if cid is None or "embedding" not in c:
            continue
        cluster_chunks_map.setdefault(cid, []).append(c["embedding"])

    for cid, embs in cluster_chunks_map.items():
        arr = np.array(embs)
        cluster_embs[cid] = arr.mean(axis=0).tolist()

    topic_map = {t["cluster_id"]: t for t in topic_nodes}

    edges = []
    cluster_ids = sorted(cluster_embs.keys())

    for i in range(len(cluster_ids)):
        for j in range(i + 1, len(cluster_ids)):
            cid_a, cid_b = cluster_ids[i], cluster_ids[j]
            if cid_a not in topic_map or cid_b not in topic_map:
                continue
            sim = cosine_similarity(cluster_embs[cid_a], cluster_embs[cid_b])
            if sim >= DAG_SIM_THRESHOLD:
                # earlier cluster is prerequisite for later
                edges.append({
                    "from_topic":        topic_map[cid_a]["topic_id"],
                    "to_topic":          topic_map[cid_b]["topic_id"],
                    "evidence":          f"Cosine similarity {sim:.3f}",
                    "cosine_similarity": sim,
                    "source_pdf":        source_pdf,
                })
                print(f"[DAG]   '{topic_map[cid_a]['label']}' → '{topic_map[cid_b]['label']}' | sim={sim:.3f}")

    print(f"[DAG] ✓ {len(edges)} edges")
    return edges


# ─────────────────────────────────────────────
# DB HELPERS
# ─────────────────────────────────────────────
def db_delete_pdf_data(source_pdf: str):
    supabase.table("chunks").delete().eq("source_pdf", source_pdf).execute()
    supabase.table("topic_nodes").delete().eq("source_pdf", source_pdf).execute()
    supabase.table("cluster_concepts").delete().eq("source_pdf", source_pdf).execute()
    supabase.table("dag_edges").delete().eq("source_pdf", source_pdf).execute()
    print(f"[DB] ✓ Cleared old data for '{source_pdf}'")

def db_insert_chunks(chunks: List[Dict]):
    BATCH = 200
    for i in range(0, len(chunks), BATCH):
        batch = chunks[i:i+BATCH]
        rows = [{
            "chunk_id": c["chunk_id"], "source_pdf": c["source_pdf"],
            "text": c["text"], "token_count": c["token_count"],
            "page_num": c["page_num"], "embedding": c["embedding"],
            "cluster_id": c.get("cluster_id"),
        } for c in batch]
        supabase.table("chunks").insert(rows).execute()
    print(f"[DB] ✓ {len(chunks)} chunks inserted")

def db_insert_topic_node(topic: Dict):
    supabase.table("topic_nodes").insert({
        "topic_id": topic["topic_id"], "label": topic["label"],
        "cluster_id": topic["cluster_id"], "core_chunk_id": topic["core_chunk_id"],
        "supporting_chunk_ids": topic["supporting_chunk_ids"],
        "source_pdf": topic["source_pdf"],
    }).execute()

def db_insert_concepts(concepts: List[Dict]):
    if concepts:
        supabase.table("cluster_concepts").insert(concepts).execute()
        print(f"[DB] ✓ {len(concepts)} concepts inserted")

def db_insert_dag_edges(edges: List[Dict]):
    if edges:
        supabase.table("dag_edges").insert(edges).execute()
        print(f"[DB] ✓ {len(edges)} dag edges inserted")

def db_load_chunks(source_pdf: str) -> List[Dict]:
    res = (supabase.table("chunks").select("chunk_id,text,cluster_id,page_num,token_count")
           .eq("source_pdf", source_pdf).order("page_num").execute())
    return res.data

def db_load_topics(source_pdf: str) -> List[Dict]:
    res = (supabase.table("topic_nodes")
           .select("topic_id,label,cluster_id,core_chunk_id,supporting_chunk_ids")
           .eq("source_pdf", source_pdf).order("cluster_id").execute())
    return res.data

def db_load_dag_edges(source_pdf: str) -> List[Dict]:
    res = (supabase.table("dag_edges")
           .select("edge_id,from_topic,to_topic,evidence,cosine_similarity")
           .eq("source_pdf", source_pdf).execute())
    return res.data

def db_load_cluster_concepts(source_pdf: str, cluster_id: int) -> List[Dict]:
    res = (supabase.table("cluster_concepts").select("*")
           .eq("source_pdf", source_pdf).eq("cluster_id", cluster_id)
           .order("concept_index").execute())
    return res.data

def db_load_all_concepts(source_pdf: str) -> List[Dict]:
    res = supabase.table("cluster_concepts").select("*").eq("source_pdf", source_pdf).execute()
    return res.data

def db_similarity_search(query_embedding: List[float], source_pdf: str, top_k: int = 5) -> List[Dict]:
    res = supabase.rpc("match_chunks", {
        "query_embedding": query_embedding,
        "match_source_pdf": source_pdf,
        "match_count": top_k,
    }).execute()
    return res.data

# Student model DB helpers
def db_get_or_create_session(user_id: str, source_pdf: str, subject: str) -> Dict:
    res = (supabase.table("student_sessions").select("*")
           .eq("user_id", user_id).eq("source_pdf", source_pdf).eq("status", "active")
           .limit(1).execute())
    if res.data:
        return res.data[0]
    session_id = f"sess_{uuid.uuid4().hex[:16]}"
    data = {"session_id": session_id, "user_id": user_id, "source_pdf": source_pdf,
            "subject": subject, "current_cluster": 0, "status": "active"}
    return supabase.table("student_sessions").insert(data).execute().data[0]

def db_get_session(session_id: str) -> Optional[Dict]:
    res = supabase.table("student_sessions").select("*").eq("session_id", session_id).limit(1).execute()
    return res.data[0] if res.data else None

def db_get_concept_mastery(session_id: str, concept_id: str) -> Optional[Dict]:
    res = (supabase.table("concept_mastery").select("*")
           .eq("session_id", session_id).eq("concept_id", concept_id).limit(1).execute())
    return res.data[0] if res.data else None

def db_upsert_concept_mastery(data: Dict) -> Dict:
    res = supabase.table("concept_mastery").upsert(data, on_conflict="session_id,concept_id").execute()
    return res.data[0] if res.data else data

def db_get_cluster_concept_mastery(session_id: str, cluster_id: int) -> List[Dict]:
    res = (supabase.table("concept_mastery").select("*")
           .eq("session_id", session_id).eq("cluster_id", cluster_id).execute())
    return res.data

def db_get_all_concept_mastery(session_id: str) -> List[Dict]:
    return supabase.table("concept_mastery").select("*").eq("session_id", session_id).execute().data

def db_get_cluster_chunks_mastery(session_id: str, cluster_id: int) -> List[Dict]:
    res = (supabase.table("chunk_mastery").select("*")
           .eq("session_id", session_id).eq("cluster_id", cluster_id).execute())
    return res.data

def db_upsert_cluster_mastery(data: Dict) -> Dict:
    res = supabase.table("cluster_mastery").upsert(data, on_conflict="session_id,cluster_id").execute()
    return res.data[0] if res.data else data

def db_advance_session_cluster(session_id: str, new_cluster: int):
    supabase.table("student_sessions").update({
        "current_cluster": new_cluster, "updated_at": datetime.utcnow().isoformat()
    }).eq("session_id", session_id).execute()

def db_complete_session(session_id: str):
    supabase.table("student_sessions").update({
        "status": "completed", "updated_at": datetime.utcnow().isoformat()
    }).eq("session_id", session_id).execute()

def db_log_event(session_id: str, user_id: str, event_type: str,
                 chunk_id: Optional[str] = None, cluster_id: Optional[int] = None,
                 payload: Optional[Dict] = None):
    supabase.table("session_events").insert({
        "session_id": session_id, "user_id": user_id, "event_type": event_type,
        "chunk_id": chunk_id, "cluster_id": cluster_id, "payload": payload or {},
    }).execute()


# ─────────────────────────────────────────────
# MASTERY SCORING (EWA)
# ─────────────────────────────────────────────
def compute_ewa_mastery(previous: float, current: float) -> float:
    return max(0.0, min(1.0, EWA_ALPHA * current + (1.0 - EWA_ALPHA) * previous))

def compute_cluster_concept_mastery(concept_masteries: List[Dict]) -> float:
    attempted = [c for c in concept_masteries if c.get("attempts", 0) > 0]
    if not attempted:
        return 0.0
    return sum(c["mastery_score"] for c in attempted) / len(attempted)

def update_concept_mastery_from_answer(
    session_id: str, user_id: str, concept: Dict,
    current_performance: float, chunk_id: str, remark: Optional[str] = None
) -> Dict:
    existing = db_get_concept_mastery(session_id, concept["concept_id"])
    prev_score    = existing["mastery_score"] if existing else 0.0
    prev_attempts = existing["attempts"]      if existing else 0
    prev_correct  = existing["correct"]       if existing else 0

    new_score = compute_ewa_mastery(prev_score, current_performance)

    data = {
        "session_id":    session_id, "user_id": user_id,
        "concept_id":    concept["concept_id"], "concept_name": concept["name"],
        "concept_type":  concept.get("concept_type", "definition"),
        "cluster_id":    concept["cluster_id"], "source_pdf": concept["source_pdf"],
        "mastery_score": new_score,
        "attempts":      prev_attempts + 1,
        "correct":       prev_correct + (1 if current_performance >= 0.6 else 0),
        "remark":        remark, "last_chunk_id": chunk_id,
        "last_seen":     datetime.utcnow().isoformat(),
    }
    return db_upsert_concept_mastery(data)


# ─────────────────────────────────────────────
# SCORING
# ─────────────────────────────────────────────
def score_answer(question: Dict, student_answer: str) -> Dict:
    q_type  = question.get("type", "short_answer")
    correct = question.get("answer", "").strip()
    s_ans   = student_answer.strip()

    if q_type in ("mcq", "true_false"):
        def norm(s):
            s = s.lower().strip()
            s = re.sub(r'^[a-d][\)\.]?\s*', '', s)
            s = re.sub(r'[^\w\s]', '', s)
            return re.sub(r'\s+', ' ', s).strip()
        is_correct = norm(s_ans) == norm(correct)
        if not is_correct:
            ns, nc = norm(s_ans), norm(correct)
            ratio = len(ns) / max(len(nc), 1)
            if 0.7 <= ratio <= 1.4:
                is_correct = nc in ns or ns in nc
        return {
            "is_correct": is_correct, "score": 1.0 if is_correct else 0.0,
            "feedback": question.get("explanation", "Correct!" if is_correct else f"Answer: {correct}"),
        }

    # semantic scoring
    system = SystemMessage(content=(
        "Score this student answer. Reply ONLY with JSON:\n"
        '{"is_correct": true/false, "score": 0.0-1.0, "feedback": "1 sentence"}\n'
        "Score >= 0.6 → is_correct=true. Be lenient with paraphrasing."
    ))
    human = HumanMessage(content=(
        f"Question: {question.get('question', '')}\n"
        f"Expected: {correct}\nStudent: {s_ans}\nJSON:"
    ))
    try:
        raw = llm_long.invoke([system, human]).content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw).strip()
        result = _json.loads(raw)
        score = float(result.get("score", 0.0))
        result["is_correct"] = score >= 0.6
        result["score"] = score
        return result
    except Exception:
        words_c = set(correct.lower().split())
        words_s = set(s_ans.lower().split())
        overlap = len(words_c & words_s) / max(len(words_c), 1)
        return {
            "is_correct": overlap >= 0.5, "score": overlap,
            "feedback": "Correct!" if overlap >= 0.5 else f"Key concepts: {correct}",
        }


# ─────────────────────────────────────────────
# EXPLANATION GENERATION
# ─────────────────────────────────────────────
def generate_explanation(concept: Dict, source_text: str,
                         cluster_concepts: List[Dict],
                         prev_remark: Optional[str] = None) -> Dict:
    """Generate explanation + teaching aid + questions for one concept."""
    chunk_type = concept.get("concept_type", "mixed")
    aid_hint = {
        "definition":  "Give a memorable ANALOGY.",
        "process":     "Give a MERMAID flowchart: ```mermaid\\ngraph TD\\n...",
        "list":        "Give a MNEMONIC to remember all items.",
        "comparison":  "Give a MARKDOWN TABLE comparing items.",
        "formula":     "Show a WORKED EXAMPLE with numbers.",
    }.get(chunk_type, "Give the most helpful teaching aid.")

    concepts_ctx = "\n".join(
        f"  • {c['name']} ({c['concept_type']}): {c.get('definition_text','')}"
        for c in cluster_concepts[:6]
    )
    key_pts = "\n".join(f"  • {p}" for p in (concept.get("key_points") or []))
    prev_ctx = f"\nPrevious context: {prev_remark}" if prev_remark else ""

    system = SystemMessage(content=(
        "You are a GATE CSE tutor. Teach the given concept deeply.\n"
        "Respond ONLY with valid JSON (no fences, no preamble):\n"
        '{"explanation":"3-5 sentences","aid_type":"mnemonic|analogy|diagram|table|example",'
        '"aid_content":"the actual aid","aid_label":"SHORT LABEL",'
        '"questions":[{"type":"mcq|short_answer|true_false|fill_blank",'
        '"question":"...","options":["A)...","B)...","C)...","D)..."],'
        '"answer":"...","explanation":"...","concept_name":"..."}]}\n\n'
        "Rules: 1-3 questions. MCQ has exactly 4 options. true_false options = [\"True\",\"False\"].\n"
        f"Teaching aid: {aid_hint}"
    ))
    human = HumanMessage(content=(
        f"Concept: {concept['name']}\nType: {chunk_type}\n"
        f"Definition: {concept.get('definition_text', '')}\n"
        f"Key points:\n{key_pts}{prev_ctx}\n\n"
        f"Cluster concepts for context:\n{concepts_ctx}\n\n"
        f"Source text:\n{source_text[:2000]}\n\nJSON:"
    ))

    try:
        raw = llm_long.invoke([system, human]).content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw).strip()
        parsed = _json.loads(raw)
        return {
            "explanation":  parsed.get("explanation", ""),
            "aid_type":     parsed.get("aid_type", ""),
            "aid_content":  parsed.get("aid_content", ""),
            "aid_label":    parsed.get("aid_label", ""),
            "questions":    parsed.get("questions", []),
        }
    except Exception as e:
        print(f"[EXPLAIN] ✗ {e} — using fallback")
        return {
            "explanation":  concept.get("definition_text", concept["name"]),
            "aid_type":     "mnemonic",
            "aid_content":  " | ".join(concept.get("key_points") or [concept["name"]]),
            "aid_label":    "KEY POINTS",
            "questions": [{
                "type": "short_answer",
                "question": f"Explain {concept['name']} in your own words.",
                "options": None,
                "answer": concept.get("definition_text", ""),
                "explanation": "Any answer covering the definition.",
                "concept_name": concept["name"],
            }],
        }


def generate_chunk_remark(concept_name: str, mastery_score: float,
                          correct: int, attempts: int) -> str:
    pct = int((correct / max(attempts, 1)) * 100)
    system = SystemMessage(content="Write exactly 1 sentence about a student's grasp of a concept. Be direct.")
    human  = HumanMessage(content=(
        f"Concept: '{concept_name}' | Score: {mastery_score:.0%} | {correct}/{attempts} correct ({pct}%)\n"
        f"1 sentence:"
    ))
    try:
        return llm_long.invoke([system, human]).content.strip()
    except Exception:
        status = "mastered" if mastery_score >= MASTERY_THRESHOLD else "needs more practice on"
        return f"Student has {status} {concept_name}."


def generate_cluster_remark(cluster_label: str, concept_masteries: List[Dict],
                            cluster_score: float) -> str:
    mastered = [c for c in concept_masteries if c["mastery_score"] >= MASTERY_THRESHOLD]
    weak     = [c for c in concept_masteries if c["mastery_score"] < MASTERY_THRESHOLD and c.get("attempts", 0) > 0]
    system = SystemMessage(content="Write 2-3 sentences summarizing a student's cluster performance. Name concepts.")
    human  = HumanMessage(content=(
        f"Cluster: {cluster_label} | Score: {cluster_score:.0%}\n"
        f"Mastered: {', '.join(c['concept_name'] for c in mastered[:4]) or 'none'}\n"
        f"Weak: {', '.join(c['concept_name'] for c in weak[:3]) or 'none'}\n"
        f"2-3 sentences:"
    ))
    try:
        return llm_long.invoke([system, human]).content.strip()
    except Exception:
        return f"Completed {cluster_label} with {cluster_score:.0%} mastery. {len(weak)} concepts need review."


def generate_roundup_questions(cluster_label: str, concepts: List[Dict],
                               concept_masteries: List[Dict]) -> List[Dict]:
    mastery_map = {m["concept_id"]: m["mastery_score"] for m in concept_masteries}
    sorted_concepts = sorted(concepts, key=lambda c: mastery_map.get(c["concept_id"], 0.0))
    summary = "\n".join(
        f"  {i+1}. {c['name']} ({c['concept_type']}) — {mastery_map.get(c['concept_id'],0):.0%} — {c.get('definition_text','')}"
        for i, c in enumerate(sorted_concepts)
    )
    system = SystemMessage(content=(
        "Write 3-5 synthesis (not recall) questions testing CONNECTIONS between concepts. "
        "Respond ONLY with a JSON array. MCQ=4 options.\n"
        '[{"type":"mcq|short_answer|true_false","question":"...","options":[...],'
        '"answer":"...","explanation":"...","concepts_tested":["..."]}]'
    ))
    human = HumanMessage(content=f"Cluster: {cluster_label}\nConcepts:\n{summary}\n\nJSON array:")
    try:
        raw = llm_long.invoke([system, human]).content.strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw).strip()
        questions = _json.loads(raw)
        if not isinstance(questions, list):
            questions = questions.get("questions", [])
        return questions[:5]
    except Exception:
        return [{
            "type": "short_answer",
            "question": f"Explain {c['name']} and how it relates to {cluster_label}.",
            "options": None, "answer": c.get("definition_text", ""),
            "explanation": "Cover the key points.", "concepts_tested": [c["name"]],
        } for c in sorted_concepts[:3]]


# ─────────────────────────────────────────────
# LOAD ALL DATA
# ─────────────────────────────────────────────
def load_all_data(source_pdf: str) -> Dict:
    chunks    = db_load_chunks(source_pdf)
    topics    = db_load_topics(source_pdf)
    dag_edges = db_load_dag_edges(source_pdf)

    cluster_summary: Dict[int, Dict] = {}
    for c in chunks:
        cid = c.get("cluster_id")
        if cid is not None:
            cluster_summary.setdefault(cid, {"cluster_id": cid, "chunk_count": 0, "label": None})
            cluster_summary[cid]["chunk_count"] += 1
    for t in topics:
        cid = t.get("cluster_id")
        if cid is not None and cid in cluster_summary:
            cluster_summary[cid]["label"] = t["label"]

    return {
        "source_pdf": source_pdf, "chunks": chunks, "topics": topics,
        "clusters": list(cluster_summary.values()), "dag_edges": dag_edges,
    }


# ─────────────────────────────────────────────
# API ROUTES
# ─────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    print("\n[STARTUP] SQL to run in Supabase:")
    print(SETUP_SQL)
    print("[STARTUP] ✓ Ready\n")


@app.get("/health")
def health_check():
    return {
        "status": "ok", "timestamp": datetime.utcnow().isoformat(),
        "embed_model": FASTEMBED_MODEL, "embed_dim": EMBED_DIM, "llm_model": GROQ_MODEL,
    }


@app.post("/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Full pipeline:
    PDF → Chunk → Embed → Cluster (window) → Concept extraction per chunk
    → Topic labels → DAG (cosine similarity) → Store
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files accepted")

    source_pdf = file.filename
    pdf_bytes  = await file.read()
    print(f"\n[PIPELINE] Starting: {source_pdf} ({len(pdf_bytes):,} bytes)")

    # 1. Chunk
    chunks = extract_and_chunk_pdf(pdf_bytes, source_pdf)
    if not chunks:
        raise HTTPException(status_code=422, detail="No valid chunks extracted")

    # 2. Embed
    chunks = embed_chunks(chunks)

    # 3. Group into clusters (sliding window)
    cluster_map = group_chunks_into_clusters(chunks)

    # 4. Clear old data
    db_delete_pdf_data(source_pdf)

    # 5. Insert chunks
    db_insert_chunks(chunks)

    # 6. Extract topic label + concepts per cluster
    topic_nodes    = []
    all_concepts   = []

    for cluster_id, cluster_chunks in sorted(cluster_map.items()):
        # Topic label
        label    = extract_topic_label(cluster_chunks)
        topic_id = f"topic_{uuid.uuid4().hex[:10]}"
        node = {
            "topic_id":             topic_id,
            "label":                label,
            "cluster_id":           cluster_id,
            "core_chunk_id":        cluster_chunks[0]["chunk_id"],
            "supporting_chunk_ids": [c["chunk_id"] for c in cluster_chunks[1:]],
            "source_pdf":           source_pdf,
        }
        topic_nodes.append(node)
        db_insert_topic_node(node)
        print(f"[TOPIC] Cluster {cluster_id} → '{label}'")

        # Concepts: call LLM per chunk, deduplicate by name
        seen_names = set()
        cluster_concepts = []
        for chunk in cluster_chunks:
            raw_concepts = extract_concepts_from_chunk(chunk)
            for i, rc in enumerate(raw_concepts):
                name = rc.get("name", "")
                if not name or name.lower() in seen_names:
                    continue
                seen_names.add(name.lower())
                cluster_concepts.append({
                    "concept_id":       f"concept_{uuid.uuid4().hex[:12]}",
                    "cluster_id":       cluster_id,
                    "source_pdf":       source_pdf,
                    "concept_index":    len(cluster_concepts),
                    "name":             name,
                    "concept_type":     rc.get("concept_type", "definition"),
                    "definition_text":  rc.get("definition_text", ""),
                    "key_points":       rc.get("key_points", []),
                    "source_chunk_ids": [chunk["chunk_id"]],
                })
            time.sleep(0.2)  # light rate-limit buffer

        all_concepts.extend(cluster_concepts)
        if cluster_concepts:
            db_insert_concepts(cluster_concepts)

        time.sleep(0.3)

    # 7. DAG
    dag_edges = build_dag(topic_nodes, chunks, source_pdf)
    db_insert_dag_edges(dag_edges)

    result = load_all_data(source_pdf)
    result["pipeline_summary"] = {
        "total_chunks":    len(chunks),
        "total_clusters":  len(cluster_map),
        "total_topics":    len(topic_nodes),
        "total_concepts":  len(all_concepts),
        "total_dag_edges": len(dag_edges),
        "embed_model":     FASTEMBED_MODEL,
        "llm_model":       GROQ_MODEL,
    }
    print(f"[PIPELINE] ✓ Done | chunks={len(chunks)} | clusters={len(cluster_map)} | concepts={len(all_concepts)} | edges={len(dag_edges)}")
    return result


@app.get("/data/{source_pdf}")
def get_data(source_pdf: str):
    return load_all_data(source_pdf)


@app.get("/pdfs")
def list_pdfs():
    res  = supabase.table("chunks").select("source_pdf").execute()
    pdfs = sorted({row["source_pdf"] for row in res.data})
    return {"pdfs": pdfs}


@app.get("/library")
def get_library(user_id: Optional[str] = None):
    res = supabase.table("chunks").select("source_pdf").execute()
    if not res.data:
        return {"pdfs": []}
    source_pdfs = sorted({row["source_pdf"] for row in res.data})
    library = []
    for pdf in source_pdfs:
        chunks   = db_load_chunks(pdf)
        topics   = db_load_topics(pdf)
        concepts = db_load_all_concepts(pdf)
        cluster_ids = sorted({c["cluster_id"] for c in chunks if c.get("cluster_id") is not None})

        mastery_summary = {"total_concepts": len(concepts), "mastered": 0,
                           "overall_score": 0.0, "sessions": 0}
        if user_id:
            sessions_res = (supabase.table("student_sessions")
                           .select("session_id,status,updated_at")
                           .eq("user_id", user_id).eq("source_pdf", pdf).execute())
            sessions = sessions_res.data or []
            mastery_summary["sessions"] = len(sessions)
            if sessions:
                active = next((s for s in sessions if s["status"] == "active"), sessions[0])
                concept_rows = db_get_all_concept_mastery(active["session_id"])
                if concept_rows:
                    mastered = sum(1 for c in concept_rows if c["mastery_score"] >= MASTERY_THRESHOLD)
                    overall  = sum(c["mastery_score"] for c in concept_rows) / len(concept_rows)
                    mastery_summary.update({"mastered": mastered, "overall_score": round(overall, 3),
                                           "session_id": active["session_id"]})

        cluster_map: Dict[int, Dict] = {}
        for c in chunks:
            cid = c.get("cluster_id")
            if cid is not None:
                cluster_map.setdefault(cid, {"cluster_id": cid, "chunk_count": 0,
                                             "label": None, "concept_count": 0})
                cluster_map[cid]["chunk_count"] += 1
        for t in topics:
            cid = t.get("cluster_id")
            if cid in cluster_map:
                cluster_map[cid]["label"] = t["label"]
        for c in concepts:
            cid = c.get("cluster_id")
            if cid in cluster_map:
                cluster_map[cid]["concept_count"] += 1

        library.append({
            "source_pdf": pdf, "chunk_count": len(chunks),
            "cluster_count": len(cluster_ids), "topic_count": len(topics),
            "concept_count": len(concepts),
            "clusters": sorted(cluster_map.values(), key=lambda x: x["cluster_id"]),
            "mastery": mastery_summary,
        })
    return {"pdfs": library}


class SearchRequest(BaseModel):
    query: str
    source_pdf: str
    top_k: int = 5

@app.post("/search")
def search(req: SearchRequest):
    query_emb = embed_query(req.query)
    raw       = db_similarity_search(query_emb, req.source_pdf, req.top_k)
    cluster_ids_found = {row.get("cluster_id") for row in raw}
    chunks_out = [{
        "chunk_id": r["chunk_id"], "text": r["text"], "cluster_id": r["cluster_id"],
        "page_num": r["page_num"], "token_count": r["token_count"],
        "similarity": float(r.get("similarity", 0)),
    } for r in raw]
    clusters_info = []
    for cid in cluster_ids_found:
        if cid is None:
            continue
        res = (supabase.table("topic_nodes").select("topic_id,label,cluster_id")
               .eq("cluster_id", cid).eq("source_pdf", req.source_pdf).limit(1).execute())
        if res.data:
            clusters_info.append(res.data[0])
    return {"query": req.query, "chunks": chunks_out, "clusters": clusters_info}


@app.get("/dag/{source_pdf}")
def get_dag(source_pdf: str):
    topics    = db_load_topics(source_pdf)
    dag_edges = db_load_dag_edges(source_pdf)
    label_map = {t["topic_id"]: t["label"] for t in topics}
    enriched  = [{**e, "from_label": label_map.get(e["from_topic"], "?"),
                       "to_label":   label_map.get(e["to_topic"],   "?")}
                 for e in dag_edges]
    return {"source_pdf": source_pdf, "nodes": topics, "edges": enriched}


@app.get("/concepts/{source_pdf}")
def get_concepts(source_pdf: str):
    concepts   = db_load_all_concepts(source_pdf)
    by_cluster: Dict[int, List] = {}
    for c in concepts:
        by_cluster.setdefault(c["cluster_id"], []).append(c)
    return {"source_pdf": source_pdf, "total_concepts": len(concepts),
            "by_cluster": by_cluster, "concepts": concepts}


# ─────────────────────────────────────────────
# SESSION ENDPOINTS
# ─────────────────────────────────────────────
class StartSessionRequest(BaseModel):
    user_id:    str
    source_pdf: str
    subject:    str = "general"

class ConceptExplainRequest(BaseModel):
    session_id: str
    user_id:    str
    concept_id: str

class ConceptAnswerRequest(BaseModel):
    session_id:     str
    user_id:        str
    concept_id:     str
    concept_name:   str
    cluster_id:     int
    question_index: int
    student_answer: str
    question:       Dict

class RoundupRequest(BaseModel):
    session_id: str
    user_id:    str
    cluster_id: int

class RoundupAnswerRequest(BaseModel):
    session_id:      str
    user_id:         str
    cluster_id:      int
    question_index:  int
    student_answer:  str
    question:        Dict
    total_questions: int

class AdvanceClusterRequest(BaseModel):
    session_id: str
    user_id:    str


@app.post("/session/start")
def start_session(req: StartSessionRequest):
    session         = db_get_or_create_session(req.user_id, req.source_pdf, req.subject)
    session_id      = session["session_id"]
    current_cluster = session["current_cluster"]

    if session["status"] == "completed":
        return {"session_id": session_id, "status": "completed",
                "current_cluster": current_cluster, "concepts": [], "concept_mastery": []}

    concepts          = db_load_cluster_concepts(req.source_pdf, current_cluster)
    concept_masteries = db_get_cluster_concept_mastery(session_id, current_cluster)
    mastery_map       = {m["concept_id"]: m for m in concept_masteries}

    unmastered   = [c for c in concepts
                    if mastery_map.get(c["concept_id"], {}).get("mastery_score", 0.0) < MASTERY_THRESHOLD]
    all_mastered = len(unmastered) == 0 and len(concepts) > 0

    topics      = db_load_topics(req.source_pdf)
    topic       = next((t for t in topics if t["cluster_id"] == current_cluster), None)
    topic_label = topic["label"] if topic else f"Cluster {current_cluster}"

    all_chunks   = db_load_chunks(req.source_pdf)
    all_clusters = sorted({c["cluster_id"] for c in all_chunks if c.get("cluster_id") is not None})

    prev_remark = None
    if current_cluster > 0:
        prev_res = (supabase.table("cluster_mastery").select("remark")
                   .eq("session_id", session_id).eq("cluster_id", current_cluster - 1)
                   .limit(1).execute())
        if prev_res.data:
            prev_remark = prev_res.data[0].get("remark")

    return {
        "session_id": session_id, "status": session["status"],
        "source_pdf": req.source_pdf, "subject": req.subject,
        "current_cluster": current_cluster, "topic_label": topic_label,
        "total_clusters": len(all_clusters),
        "concepts": concepts, "concept_mastery": concept_masteries,
        "unmastered_count": len(unmastered),
        "next_concept": unmastered[0] if unmastered else None,
        "all_concepts_mastered": all_mastered,
        "prev_cluster_remark": prev_remark,
    }


@app.post("/session/concept/explain")
def explain_concept(req: ConceptExplainRequest):
    session = db_get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    source_pdf = session["source_pdf"]

    concept_res = (supabase.table("cluster_concepts").select("*")
                   .eq("concept_id", req.concept_id).limit(1).execute())
    if not concept_res.data:
        raise HTTPException(status_code=404, detail="Concept not found")
    concept    = concept_res.data[0]
    cluster_id = concept["cluster_id"]

    # Fetch source chunks
    source_chunk_ids = concept.get("source_chunk_ids") or []
    source_chunks    = []
    if source_chunk_ids:
        res = (supabase.table("chunks").select("chunk_id,text,page_num,token_count")
               .in_("chunk_id", source_chunk_ids[:3]).execute())
        source_chunks = res.data
    source_text = "\n\n".join(
        f"[Page {c.get('page_num','?')}]\n{c['text']}" for c in source_chunks
    ) if source_chunks else concept.get("definition_text", "")

    cluster_concepts = db_load_cluster_concepts(source_pdf, cluster_id)

    # Previous remark for flow
    existing  = db_get_concept_mastery(req.session_id, req.concept_id)
    prev_remark = existing.get("remark") if existing else None
    if not prev_remark:
        masteries = db_get_cluster_concept_mastery(req.session_id, cluster_id)
        remarks   = [m["remark"] for m in masteries if m.get("remark") and m["concept_id"] != req.concept_id]
        prev_remark = remarks[-1] if remarks else None

    topics      = db_load_topics(source_pdf)
    topic       = next((t for t in topics if t["cluster_id"] == cluster_id), None)
    topic_label = topic["label"] if topic else f"Cluster {cluster_id}"

    result = generate_explanation(concept, source_text, cluster_concepts, prev_remark)

    # Init mastery row if first visit
    if not existing:
        db_upsert_concept_mastery({
            "session_id": req.session_id, "user_id": req.user_id,
            "concept_id": req.concept_id, "concept_name": concept["name"],
            "concept_type": concept["concept_type"], "cluster_id": cluster_id,
            "source_pdf": source_pdf, "mastery_score": 0.0,
            "attempts": 0, "correct": 0, "remark": None, "last_chunk_id": None,
            "last_seen": datetime.utcnow().isoformat(),
        })

    db_log_event(req.session_id, req.user_id, "concept_viewed", cluster_id=cluster_id,
                 payload={"concept_id": req.concept_id, "concept_name": concept["name"]})

    return {
        "concept_id": req.concept_id, "concept_name": concept["name"],
        "concept_type": concept["concept_type"],
        "definition_text": concept.get("definition_text", ""),
        "key_points": concept.get("key_points", []),
        "cluster_id": cluster_id, "topic_label": topic_label,
        "source_chunks": source_chunks,
        **result,
        "prev_remark": prev_remark,
        "cluster_concepts": cluster_concepts,
    }


@app.post("/session/concept/answer")
def answer_concept(req: ConceptAnswerRequest):
    session = db_get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    source_pdf = session["source_pdf"]

    score_result = score_answer(req.question, req.student_answer)
    is_correct   = score_result["is_correct"]
    perf_score   = score_result["score"]

    concept_res = (supabase.table("cluster_concepts").select("*")
                   .eq("concept_id", req.concept_id).limit(1).execute())
    concept = concept_res.data[0] if concept_res.data else {
        "concept_id": req.concept_id, "name": req.concept_name,
        "concept_type": "definition", "cluster_id": req.cluster_id, "source_pdf": source_pdf,
    }

    updated_mastery = update_concept_mastery_from_answer(
        session_id=req.session_id, user_id=req.user_id, concept=concept,
        current_performance=perf_score, chunk_id=req.concept_id,
    )
    new_score   = updated_mastery["mastery_score"]
    is_mastered = new_score >= MASTERY_THRESHOLD

    remark = generate_chunk_remark(req.concept_name, new_score,
                                   updated_mastery["correct"], updated_mastery["attempts"])
    updated_mastery["remark"] = remark
    db_upsert_concept_mastery(updated_mastery)

    all_concepts      = db_load_cluster_concepts(source_pdf, req.cluster_id)
    concept_masteries = db_get_cluster_concept_mastery(req.session_id, req.cluster_id)
    mastery_map       = {m["concept_id"]: m["mastery_score"] for m in concept_masteries}
    mastered_count    = sum(1 for c in all_concepts if mastery_map.get(c["concept_id"], 0.0) >= MASTERY_THRESHOLD)
    all_mastered      = mastered_count == len(all_concepts) and len(all_concepts) > 0

    next_concept = next(
        (c for c in all_concepts
         if mastery_map.get(c["concept_id"], 0.0) < MASTERY_THRESHOLD
         and c["concept_id"] != req.concept_id),
        None
    )

    concept_scores = [
        {"concept_id": m["concept_id"], "concept_name": m["concept_name"],
         "mastery_score": m["mastery_score"],
         "is_mastered": m["mastery_score"] >= MASTERY_THRESHOLD}
        for m in concept_masteries
    ]

    db_log_event(req.session_id, req.user_id, "concept_answer", cluster_id=req.cluster_id,
                 payload={"concept_id": req.concept_id, "is_correct": is_correct,
                          "mastery_score": new_score})

    return {
        "concept_id": req.concept_id, "concept_name": req.concept_name,
        "question_index": req.question_index,
        "is_correct": is_correct, "score": perf_score, "feedback": score_result["feedback"],
        "mastery_score": new_score, "is_mastered": is_mastered,
        "attempts": updated_mastery["attempts"], "correct": updated_mastery["correct"],
        "remark": remark, "next_concept": next_concept,
        "all_concepts_mastered": all_mastered, "concept_scores": concept_scores,
        "ready_for_roundup": all_mastered,
    }


@app.post("/session/cluster/roundup")
def cluster_roundup(req: RoundupRequest):
    session = db_get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    source_pdf = session["source_pdf"]
    concepts  = db_load_cluster_concepts(source_pdf, req.cluster_id)
    masteries = db_get_cluster_concept_mastery(req.session_id, req.cluster_id)
    topics      = db_load_topics(source_pdf)
    topic       = next((t for t in topics if t["cluster_id"] == req.cluster_id), None)
    cluster_label = topic["label"] if topic else f"Cluster {req.cluster_id}"
    questions = generate_roundup_questions(cluster_label, concepts, masteries)
    db_log_event(req.session_id, req.user_id, "roundup_started", cluster_id=req.cluster_id,
                 payload={"question_count": len(questions)})
    return {
        "session_id": req.session_id, "cluster_id": req.cluster_id,
        "cluster_label": cluster_label, "questions": questions, "total": len(questions),
    }


@app.post("/session/cluster/roundup/answer")
def roundup_answer(req: RoundupAnswerRequest):
    session = db_get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    source_pdf   = session["source_pdf"]
    score_result = score_answer(req.question, req.student_answer)
    is_last      = req.question_index >= req.total_questions - 1

    cluster_remark = None
    cluster_score  = None

    if is_last:
        concept_masteries = db_get_cluster_concept_mastery(req.session_id, req.cluster_id)
        cluster_score     = compute_cluster_concept_mastery(concept_masteries)
        topics        = db_load_topics(source_pdf)
        topic         = next((t for t in topics if t["cluster_id"] == req.cluster_id), None)
        cluster_label = topic["label"] if topic else f"Cluster {req.cluster_id}"
        cluster_remark = generate_cluster_remark(cluster_label, concept_masteries, cluster_score)
        chunk_masteries = db_get_cluster_chunks_mastery(req.session_id, req.cluster_id)
        db_upsert_cluster_mastery({
            "session_id": req.session_id, "user_id": req.user_id,
            "cluster_id": req.cluster_id, "source_pdf": source_pdf,
            "mastery_score": cluster_score,
            "chunks_total": len(chunk_masteries),
            "chunks_mastered": sum(1 for m in chunk_masteries if m["mastery_score"] >= MASTERY_THRESHOLD),
            "remark": cluster_remark, "completed_at": datetime.utcnow().isoformat(),
        })

    db_log_event(req.session_id, req.user_id, "roundup_answer", cluster_id=req.cluster_id,
                 payload={"q_index": req.question_index, "is_correct": score_result["is_correct"]})

    return {
        "question_index": req.question_index,
        "is_correct": score_result["is_correct"], "score": score_result["score"],
        "feedback": score_result["feedback"],
        "correct_answer": req.question.get("answer", ""),
        "explanation": req.question.get("explanation", ""),
        "is_last": is_last, "cluster_score": cluster_score, "cluster_remark": cluster_remark,
    }


@app.post("/session/advance-cluster")
def advance_cluster(req: AdvanceClusterRequest):
    session = db_get_session(req.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    source_pdf      = session["source_pdf"]
    current_cluster = session["current_cluster"]

    all_chunks   = db_load_chunks(source_pdf)
    all_clusters = sorted({c["cluster_id"] for c in all_chunks if c.get("cluster_id") is not None})
    current_idx  = all_clusters.index(current_cluster) if current_cluster in all_clusters else -1
    next_idx     = current_idx + 1

    if next_idx >= len(all_clusters):
        db_complete_session(req.session_id)
        return {"session_id": req.session_id, "status": "completed",
                "next_cluster": None, "message": "All clusters completed!"}

    next_cluster = all_clusters[next_idx]
    db_advance_session_cluster(req.session_id, next_cluster)

    topics      = db_load_topics(source_pdf)
    topic       = next((t for t in topics if t["cluster_id"] == next_cluster), None)
    topic_label = topic["label"] if topic else f"Cluster {next_cluster}"
    concepts    = db_load_cluster_concepts(source_pdf, next_cluster)

    prev_remark_res = (supabase.table("cluster_mastery").select("remark")
                       .eq("session_id", req.session_id).eq("cluster_id", current_cluster)
                       .limit(1).execute())
    prev_remark = prev_remark_res.data[0]["remark"] if prev_remark_res.data else None

    return {
        "session_id": req.session_id, "status": "active",
        "next_cluster": next_cluster, "topic_label": topic_label,
        "concepts": concepts, "prev_cluster_remark": prev_remark,
    }


@app.get("/session/{session_id}/progress")
def get_progress(session_id: str):
    session = db_get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    concept_rows = db_get_all_concept_mastery(session_id)
    cluster_rows = (supabase.table("cluster_mastery").select("*")
                   .eq("session_id", session_id).execute().data)
    overall = sum(c["mastery_score"] for c in concept_rows) / len(concept_rows) if concept_rows else 0.0
    return {
        "session": session,
        "concept_mastery": concept_rows,
        "cluster_mastery": cluster_rows,
        "summary": {
            "total_concepts_seen": len(concept_rows),
            "concepts_mastered":   sum(1 for c in concept_rows if c["mastery_score"] >= MASTERY_THRESHOLD),
            "clusters_completed":  len(cluster_rows),
            "overall_score":       overall,
            "ewa_alpha":           EWA_ALPHA,
            "mastery_threshold":   MASTERY_THRESHOLD,
        },
    }


# ─────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)