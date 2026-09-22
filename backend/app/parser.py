import re
from pathlib import Path
from .models import Transcript, TranscriptTurn
import hashlib

def parse_transcript(file_path: str) -> Transcript:
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"Transcript file not found: {file_path}")
        
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
        
    lines = content.strip().split('\n')
    
    # Extract Metadata
    expert_name = lines[0].split('–')[-1].strip() if '–' in lines[0] else lines[0]
    role = lines[1].replace('Role:', '').strip()
    country = lines[2].replace('Market:', '').strip()
    
    transcript_id = f"tx_{hashlib.md5(path.name.encode()).hexdigest()[:8]}"
    
    transcript = Transcript(
        transcript_id=transcript_id,
        expert_name=expert_name,
        role=role,
        country=country,
        source_file=path.name,
        original_content=content,
        turns=[]
    )
    
    # Parse Turns
    timestamp_pattern = re.compile(r'^(\d{2}:\d{2})$')
    
    current_timestamp = None
    current_speaker = None
    current_text = []
    source_order = 0
    
    def save_turn():
        nonlocal current_timestamp, current_speaker, current_text, source_order
        if current_timestamp and current_speaker:
            text = '\n'.join(current_text).strip()
            turn = TranscriptTurn(
                turn_id=f"{transcript_id}_turn_{source_order}",
                transcript_id=transcript_id,
                speaker=current_speaker,
                timestamp_start=current_timestamp,
                original_text=text,
                source_order=source_order
            )
            transcript.turns.append(turn)
            source_order += 1
            
        current_text = []
        current_speaker = None
    
    i = 3
    while i < len(lines):
        line = lines[i].strip()
        if not line:
            i += 1
            continue
            
        timestamp_match = timestamp_pattern.match(line)
        if timestamp_match:
            save_turn() # save previous turn if exists
            current_timestamp = timestamp_match.group(1)
            i += 1
            if i < len(lines) and lines[i].strip():
                # Next line should be "Speaker: Text..."
                speaker_line = lines[i].strip()
                if ':' in speaker_line:
                    speaker_part, text_part = speaker_line.split(':', 1)
                    current_speaker = speaker_part.strip()
                    current_text.append(text_part.strip())
                else:
                    # Fallback if colon is missing (shouldn't happen in valid format)
                    current_speaker = "Unknown"
                    current_text.append(speaker_line)
        else:
            if current_timestamp:
                current_text.append(line)
        i += 1
        
    save_turn() # save final turn
    
    return transcript
