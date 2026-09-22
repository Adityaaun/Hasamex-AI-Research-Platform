import logging
import sys
from pathlib import Path
from .parser import parse_transcript
from .chunking import create_evidence_chunks
from .validation import validate_integrity
from .db import VectorStoreService

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def main():
    data_dir = Path("data")
    if not data_dir.exists():
        logger.error(f"Data directory not found at {data_dir.absolute()}")
        sys.exit(1)

    transcript_files = list(data_dir.glob("transcript_*.txt"))
    if not transcript_files:
        logger.error("No transcript files found in data directory.")
        sys.exit(1)

    logger.info("[INGEST] Loading transcripts...")
    transcripts = []
    
    for file_path in transcript_files:
        try:
            transcript = parse_transcript(str(file_path))
            transcripts.append(transcript)
        except Exception as e:
            logger.error(f"[PARSE ERROR] Failed to parse {file_path}: {e}")
            sys.exit(1)

    logger.info(f"[PARSE] Extracted turns from {len(transcripts)} transcripts.")
    
    all_chunks = []
    for transcript in transcripts:
        chunks = create_evidence_chunks(transcript)
        all_chunks.extend(chunks)

    logger.info(f"[CHUNK] Created {len(all_chunks)} evidence chunks.")

    logger.info("[VALIDATE] Running integrity validation...")
    try:
        validate_integrity(transcripts, all_chunks)
    except Exception as e:
        logger.error(f"[VALIDATE ERROR] Integrity check failed: {e}")
        sys.exit(1)

    logger.info("[INDEX] Adding chunks to ChromaDB...")
    try:
        db = VectorStoreService()
        db.index_chunks(all_chunks)
    except Exception as e:
        logger.error(f"[INDEX ERROR] DB operation failed: {e}")
        sys.exit(1)

    # Summary Output
    total_turns = sum(len(t.turns) for t in transcripts)
    print("\n--- INGESTION SUMMARY ---")
    print(f"Transcripts processed: {len(transcripts)}")
    print(f"Turns extracted: {total_turns}")
    print(f"Evidence chunks created: {len(all_chunks)}")
    print(f"Chunks indexed: {db.count()}")
    print("Validation errors: 0")

if __name__ == "__main__":
    main()
