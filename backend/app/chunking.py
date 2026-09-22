from .models import Transcript, EvidenceChunk
import hashlib

def create_evidence_chunks(transcript: Transcript) -> list[EvidenceChunk]:
    chunks = []
    buffer_turns = []
    
    for turn in transcript.turns:
        buffer_turns.append(turn)
        
        # If the expert is speaking, this is a complete context block (Question + Answer)
        # We also flush if it's the very last turn just in case.
        if turn.speaker != "Interviewer" or turn == transcript.turns[-1]:
            # Create a chunk from buffered turns
            combined_text = "\n\n".join([
                f"[{t.timestamp_start}] {t.speaker}: {t.original_text}" for t in buffer_turns
            ])
            source_turn_ids = [t.turn_id for t in buffer_turns]
            
            chunk_id = f"chunk_{hashlib.md5(combined_text.encode()).hexdigest()[:8]}"
            
            chunk = EvidenceChunk(
                chunk_id=chunk_id,
                transcript_id=transcript.transcript_id,
                expert_name=transcript.expert_name,
                role=transcript.role,
                country=transcript.country,
                speaker=turn.speaker, # Primary speaker of this chunk
                timestamp_start=buffer_turns[0].timestamp_start, # Start of the first turn (usually the question)
                timestamp_end=turn.timestamp_start, # Start of the last turn in the chunk
                original_text=combined_text,
                source_file=transcript.source_file,
                source_order=buffer_turns[0].source_order,
                source_turn_ids=source_turn_ids
            )
            chunks.append(chunk)
            buffer_turns = []
            
    return chunks
