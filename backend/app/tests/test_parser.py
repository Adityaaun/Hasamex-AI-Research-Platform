import pytest
from app.parser import parse_transcript
from app.models import Transcript

# Since we don't have mock files in tests, we can test using the actual data files
# which serves as an excellent regression test.
def test_parse_transcript_france():
    transcript = parse_transcript("data/transcript_expert1.txt")
    
    # Check Metadata
    assert transcript.expert_name == "Dr. Jean Martin"
    assert transcript.role == "Head of Urology"
    assert transcript.country == "France"
    assert "transcript_expert1.txt" in transcript.source_file
    
    # Check Turns
    assert len(transcript.turns) == 14  # Interviewer + Dr. Martin (7 Q&A pairs)
    
    # First turn should be Interviewer
    assert transcript.turns[0].speaker == "Interviewer"
    assert transcript.turns[0].timestamp_start == "00:00"
    assert "Thanks for joining" in transcript.turns[0].original_text
    
    # Second turn should be Dr. Martin
    assert transcript.turns[1].speaker == "Dr. Martin"
    assert transcript.turns[1].timestamp_start == "00:18"
    assert "Adoption is growing" in transcript.turns[1].original_text
    
    # Ordering Check
    for i, turn in enumerate(transcript.turns):
        assert turn.source_order == i

def test_parse_transcript_germany():
    transcript = parse_transcript("data/transcript_expert2.txt")
    
    assert transcript.expert_name == "Anna Keller"
    assert transcript.role == "Former Hospital Procurement Director"
    assert transcript.country == "Germany"
    assert len(transcript.turns) == 14

def test_parse_transcript_uk():
    transcript = parse_transcript("data/transcript_expert3.txt")
    
    assert transcript.expert_name == "Dr. Emily Carter"
    assert transcript.country == "United Kingdom"
    assert len(transcript.turns) == 14
