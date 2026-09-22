import pytest
from app.parser import parse_transcript
from app.chunking import create_evidence_chunks
from app.validation import validate_integrity, ValidationError

def test_integrity_passes_on_valid_data():
    t1 = parse_transcript("data/transcript_expert1.txt")
    t2 = parse_transcript("data/transcript_expert2.txt")
    t3 = parse_transcript("data/transcript_expert3.txt")
    
    transcripts = [t1, t2, t3]
    chunks = []
    for t in transcripts:
        chunks.extend(create_evidence_chunks(t))
        
    # Should not raise an exception
    assert validate_integrity(transcripts, chunks) is True

def test_integrity_fails_on_modified_text():
    t1 = parse_transcript("data/transcript_expert1.txt")
    chunks = create_evidence_chunks(t1)
    
    # Tamper with the original text of a chunk
    chunks[0].original_text = "This is fabricated evidence."
    
    with pytest.raises(ValidationError, match="text does not perfectly match original turns"):
        validate_integrity([t1], chunks)

def test_integrity_fails_on_missing_source_turns():
    t1 = parse_transcript("data/transcript_expert1.txt")
    chunks = create_evidence_chunks(t1)
    
    # Tamper with turn ids
    chunks[0].source_turn_ids.append("fake_turn_id")
    
    with pytest.raises(ValidationError, match="references unknown turn"):
        validate_integrity([t1], chunks)
