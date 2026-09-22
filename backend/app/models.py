from pydantic import BaseModel
from typing import List, Optional

class TranscriptTurn(BaseModel):
    turn_id: str
    transcript_id: str
    speaker: str
    timestamp_start: str
    timestamp_end: Optional[str] = None
    original_text: str
    source_order: int

class Transcript(BaseModel):
    transcript_id: str
    expert_name: str
    role: str
    country: str
    source_file: str
    original_content: str
    turns: List[TranscriptTurn] = []

class EvidenceChunk(BaseModel):
    chunk_id: str
    transcript_id: str
    expert_name: str
    role: str
    country: str
    speaker: str
    timestamp_start: str
    timestamp_end: Optional[str] = None
    original_text: str
    source_file: str
    source_order: int
    source_turn_ids: List[str]
