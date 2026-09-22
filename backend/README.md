# Hasamex AI Research Platform

An evidence-first AI research platform for analyzing expert-call transcripts.

## Phase 1: Ingestion & Foundation

This phase establishes the robust, hallucination-free foundation of the application. It parses transcripts into structured evidence, validates data integrity, and indexes them into a local ChromaDB instance. The LLM is **not** used during ingestion to ensure absolute fidelity to the source texts.

### Project Setup

1. **Prerequisites:** Python 3.10+
2. **Environment:**
   ```bash
   python -m venv .venv
   # Windows:
   .\.venv\Scripts\Activate.ps1
   # macOS/Linux:
   source .venv/bin/activate
   ```
3. **Install Dependencies:**
   ```bash
   pip install fastapi pydantic chromadb pytest
   ```

### Running Ingestion

To ingest the 3 expert transcripts (France, Germany, UK) and index them into ChromaDB:

```bash
python -m app.ingestion
```

Expected output:
```
[INGEST] Loading transcripts...
[PARSE] Extracted turns from 3 transcripts.
[CHUNK] Created 21 evidence chunks.
[VALIDATE] Running integrity validation...
[VALIDATE] Evidence integrity passed.
[INDEX] Adding chunks to ChromaDB...
[INDEX] Successfully indexed 21 chunks to ChromaDB.

--- INGESTION SUMMARY ---
Transcripts processed: 3
Turns extracted: 42
Evidence chunks created: 21
Chunks indexed: 21
Validation errors: 0
```

### Running Tests

To verify the integrity of the parser and evidence chunking:

```bash
python -m pytest app/tests/ -v
```
