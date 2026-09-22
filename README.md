# Hasamex AI Research Platform

**An evidence-first AI research assistant for cross-market medical expert interview analysis.**

---

## Problem Statement

A global medical device company conducted qualitative expert interviews across three markets — **France**, **Germany**, and the **United Kingdom** — to understand robotic surgery adoption. The challenge: how do you extract reliable, comparable, evidence-backed insights from unstructured interview transcripts **without hallucinating facts**?

Generic summarisation with large language models produces plausible-sounding but unverifiable claims. This system solves that by treating the **original transcript as the immutable source of truth** and using LLMs strictly as a reasoning layer constrained by retrieved evidence.

---

## Key Capabilities

| Feature | Description |
|---------|-------------|
| **Interview Guide** | Answer structured research questions per market with per-citation evidence |
| **Cross-Market Comparison** | Identify common themes and market differences with evidence mapping |
| **Ask Across Interviews** | Open-ended question answering across all transcripts |
| **Evidence / Transcript Explorer** | Click any citation to view the exact original transcript passage in context |
| **Evidence Integrity** | Every citation is validated against the original transcript source |
| **Honest Uncertainty** | Returns `insufficient_evidence` rather than fabricated answers |

---

## Architecture

### Core RAG Pipeline

```
Interview Transcripts (France, Germany, UK)
            │
            ▼
        Parser
  (timestamp + speaker + text)
            │
            ▼
    Evidence Chunks
  (Q+A pairs, multi-turn)
            │
            ▼
        ChromaDB
  (cosine similarity index)
            │
            ▼
  Semantic Retrieval
  (country-filtered, top-k)
            │
            ▼
      Gemini API
  (structured-output generation)
            │
            ▼
  Backend Citation Validation
  ┌──────────────────────────────────┐
  │ chunk_id must exist in retrieval │
  │ exact quote must exist in source │
  │ country must match market filter │
  └──────────────────────────────────┘
            │
            ▼
    Research Answer
  (status + answer + citations)
            │
            ▼
  Evidence / Transcript Explorer
  (original passage + context turns)
```

### Cross-Market Comparison (Two-Stage)

```
France ─┐
         ├── Independent Retrieval (top-2 per market)
Germany ─┤            │
         │            ▼
UK ──────┘   Stage A: Per-market extraction
               (parallel Gemini calls)
                      │
               Citation Validation
                      │
                      ▼
            Stage B: Cross-market synthesis
               (common themes + differences)
                      │
               Evidence mapping
               (chunk_ids back to validated claims)
                      │
                      ▼
              ComparisonResponse
```

---

## Technology Stack

### Frontend
- **React 18** + **TypeScript**
- **Vite** (dev server + bundler)
- **Tailwind CSS** (utility-first styling)

### Backend
- **FastAPI** (REST API, async)
- **Python 3.10**
- **ChromaDB** (local persistent vector store)
- **Google Gemini API** (`gemma-4-26b-a4b-it` via AI Studio)
- **Pydantic** (structured outputs + validation)

---

## Evidence Integrity Approach

The application enforces evidence integrity at every stage:

1. **Immutable transcript source** — Raw `.txt` transcript files are never modified. They are the ground truth for all lookups.

2. **Metadata-aware chunking** — Each chunk records `transcript_id`, `source_file`, `source_order`, and `source_turn_ids`, enabling exact turn-level retrieval.

3. **Country-level filtering** — ChromaDB `where` filters ensure France queries retrieve only France chunks. Cross-market contamination is structurally prevented.

4. **Citation ID validation** — After Gemini generates a structured response, every `chunk_id` in its output is validated against the retrieved chunk map. Unknown IDs are silently dropped.

5. **Exact quote validation** — The exact quote Gemini returns must appear verbatim in the original chunk text. If it does not, the system falls back to the original chunk text rather than displaying a hallucinated quote.

6. **Evidence Explorer** — The `GET /api/evidence/{chunk_id}` endpoint resolves a citation back to the original transcript file via ChromaDB metadata (never via a client-supplied path), parses the file, and returns the exact source turns plus surrounding context.

7. **Insufficient evidence handling** — When retrieved chunks are semantically irrelevant or Gemini's structured output explicitly signals `insufficient_evidence: true`, the system returns a clear `insufficient_evidence` status rather than a fabricated answer.

8. **Generation error handling** — Gemini timeouts, 502s, or API failures return `generation_error` status, clearly distinguished from `insufficient_evidence`.

---

## AI Architecture Rationale

### Why RAG?
The transcripts are the authoritative source. We do not fine-tune or pre-train on them — instead, we retrieve relevant passages at query time and constrain the LLM to reason only over those passages. This keeps the original text unchanged and makes every claim traceable.

### Why ChromaDB?
A lightweight, local persistent vector store with no external service dependency. Suitable for a prototype corpus of 3–300+ transcripts. If scaling beyond that, a managed service (Pinecone, Vertex AI Matching Engine) would replace it with no changes to the retrieval interface.

### Why chunk by Q+A pairs?
Expert interviews are structured as interviewer question + expert answer. Chunking at this boundary preserves semantic coherence — the expert's answer is always retrieved with the question that prompted it. This produces much more meaningful embeddings than arbitrary token splits.

### Why preserve timestamps?
Timestamps enable the Evidence Explorer to display `[00:18] Dr. Martin: ...` — making citations auditable without replaying the full recording.

### Why validate citations in the backend?
LLMs can hallucinate chunk IDs and quotes even with structured outputs. Backend validation provides a hard guarantee: if a `chunk_id` is not in the retrieved set, it cannot appear in the response. This is enforced server-side, not as a frontend hint.

---

## Hallucination Mitigation

The application does **not** claim hallucinations are impossible. Instead:

> "The application constrains generated answers to retrieved transcript evidence and validates citation IDs and exact quotes against the original source. A Gemini response that references a chunk_id not in the retrieval set is silently rejected. A quote that does not appear verbatim in the original text is replaced with the original chunk text. Answers that exceed the available evidence are flagged as `insufficient_evidence`."

---

## Scaling Discussion

### Current: 3 transcripts
- 21 evidence chunks total
- ChromaDB in-memory + local persistence
- Single FastAPI process

### 30 transcripts
- Still works with ChromaDB local persistence
- Increase `top_k` from 2–3 to 5–7
- Consider async retrieval
- Parser + chunker run once at ingestion time

### 300+ transcripts
- Replace ChromaDB with a managed vector store (Pinecone, Vertex AI)
- Add a caching layer for repeated queries
- Move ingestion to a background job with status tracking
- Add pagination to the evidence API
- Use market + topic metadata for pre-filtering before semantic search

The RAG + validation architecture remains unchanged at any scale.

---

## Limitations

- **Small source corpus** — 3 expert interviews is a very limited sample. Findings are illustrative, not statistically representative of each market.
- **Qualitative data** — Expert interviews are subjective. The system cannot quantify sentiment or make numerical comparisons unless explicitly stated in the transcripts.
- **Semantic claim validation is limited** — The backend validates citation IDs and exact quotes, but cannot validate whether the *claim* fairly represents the evidence semantically.
- **Gemini API availability** — The system depends on the Gemini AI Studio API. Latency and rate limits may vary. The current implementation times out at 30s per request and retries are not implemented for idempotent requests.
- **Transcript format dependency** — The parser expects a specific format (`Name – Expert Name`, `Role:`, `Market:`, then timestamped turns). Transcripts in other formats require parser updates.
- **No persistent user state** — The frontend is a single-page application with no session storage. Refreshing the page resets state.

---

## Local Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- A Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Configure API key
cp .env.example .env
# Edit .env and add your key:
# GEMINI_API_KEY=your_key_here

# Ingest transcripts (run once)
python -m app.ingestion

# Start the API server
python -m uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend

npm install
npm run dev
# Open http://localhost:5173
```

---

## Environment Variables

Create `backend/.env` with:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemma-4-26b-a4b-it
```

> **Never commit `.env` to version control.** The `.gitignore` already excludes it.

---

## Demo Flow (2–3 minutes)

1. **Interview Guide** → Select "What are the main barriers to adoption?" → See France/Germany/UK answers with citations
2. **Cross-Market Comparison** → Toggle to comparison view → See common themes and market differences
3. **Evidence Explorer** → Click any citation badge → See original transcript passage with surrounding context highlighted in blue
4. **Ask Across Interviews** → Ask "How does surgeon training affect adoption?" → See cross-market evidence-backed answer
5. **Unsupported question** → Ask "What is the average price of a robotic surgical system in Europe?" → See `Insufficient Evidence` response (no hallucination)

---

## Interview Explanation Guide

**Why RAG instead of fine-tuning?**
> RAG keeps the source transcripts unchanged and traceable. Fine-tuning would bake the content into model weights with no per-citation accountability.

**Why ChromaDB?**
> Zero-setup, local, fast enough for a prototype corpus. The retrieval interface is abstracted so it can be swapped for a managed store at scale.

**Why chunk by Q+A pair?**
> Preserves semantic coherence — an expert's answer always embeds with the question that elicited it.

**Why validate citations in the backend?**
> LLMs hallucinate even with structured outputs. Server-side validation is the only reliable guarantee.

**How do you reduce hallucinations?**
> Constraint + validation: the model only sees retrieved chunks, chunk IDs and quotes are validated against the originals, and `insufficient_evidence` is returned when the evidence doesn't support an answer.

**How does country filtering work?**
> ChromaDB metadata filter (`where: {country: "France"}`) applied before semantic search. ChromaDB evaluates the filter before running the embedding comparison.

**What happens when Gemini fails?**
> The system returns `generation_error` status with an honest message. The frontend displays a clear error state — it never shows a fallback fabricated answer.

**How would you scale to hundreds of interviews?**
> Swap ChromaDB for a managed vector store, add ingestion background jobs, increase `top_k` with tighter pre-filtering, and add caching for repeated queries. Core RAG + validation logic is unchanged.
