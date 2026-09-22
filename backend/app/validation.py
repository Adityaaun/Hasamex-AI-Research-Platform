from typing import List, Dict
from .models import Transcript, EvidenceChunk
import logging

logger = logging.getLogger(__name__)

class ValidationError(Exception):
    pass

def validate_integrity(transcripts: List[Transcript], chunks: List[EvidenceChunk]):
    transcript_map = {t.transcript_id: t for t in transcripts}
    turn_map = {}
    for t in transcripts:
        for turn in t.turns:
            turn_map[turn.turn_id] = turn

    for chunk in chunks:
        # 1. Every chunk belongs to an existing transcript
        if chunk.transcript_id not in transcript_map:
            raise ValidationError(f"Chunk {chunk.chunk_id} references unknown transcript {chunk.transcript_id}")
            
        t = transcript_map[chunk.transcript_id]
        
        # 2. Every chunk has a valid source file
        if chunk.source_file != t.source_file:
            raise ValidationError(f"Chunk {chunk.chunk_id} source file mismatch. Expected {t.source_file}, got {chunk.source_file}")
            
        # 3. Every chunk references valid source turns
        if not chunk.source_turn_ids:
            raise ValidationError(f"Chunk {chunk.chunk_id} has no source_turn_ids")
            
        for turn_id in chunk.source_turn_ids:
            if turn_id not in turn_map:
                raise ValidationError(f"Chunk {chunk.chunk_id} references unknown turn {turn_id}")
                
        # 4 & 6. Source ordering is preserved and chunk text can be traced back
        reconstructed_text_parts = []
        last_order = -1
        for turn_id in chunk.source_turn_ids:
            turn = turn_map[turn_id]
            if turn.source_order <= last_order:
                raise ValidationError(f"Chunk {chunk.chunk_id} turn ordering is invalid.")
            last_order = turn.source_order
            reconstructed_text_parts.append(f"[{turn.timestamp_start}] {turn.speaker}: {turn.original_text}")
            
        reconstructed_text = "\n\n".join(reconstructed_text_parts)
        if chunk.original_text != reconstructed_text:
            raise ValidationError(f"Chunk {chunk.chunk_id} text does not perfectly match original turns.")
            
        # 7. No source transcript was modified (Original transcript trace)
        # Verify that reconstructed chunk text is a substring of the transcript's full original_content (ignoring the exact spacing around the assembled string vs original)
        # Actually, in our parser, the original text might lack the "[00:00] Speaker:" prefix since we assembled it. 
        # But we can check if the turn's original_text is in the transcript.
        for turn_id in chunk.source_turn_ids:
            turn = turn_map[turn_id]
            if turn.original_text not in t.original_content:
                raise ValidationError(f"Turn {turn_id} text was not found in original transcript content.")

    logger.info("[VALIDATE] Evidence integrity passed.")
    return True
