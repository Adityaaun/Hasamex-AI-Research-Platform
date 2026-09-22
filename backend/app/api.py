from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .db import VectorStoreService
from .gemini import GeminiService
from .rag import RAGService
from .guide import get_all_questions, get_question_by_id
from .parser import parse_transcript
import os
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Dependency injection for services
def get_rag_service():
    db = VectorStoreService()
    llm = GeminiService()
    return RAGService(db, llm)

class AskRequest(BaseModel):
    question: str
    filters: Optional[Dict[str, Any]] = None

@router.post("/api/ask")
def ask_question(request: AskRequest, rag: RAGService = Depends(get_rag_service)):
    try:
        response = rag.process_query(request.question, filters=request.filters, top_k=15)
        return response
    except Exception as e:
        logger.error(f"API Error: {str(e)}")
        return {
            "status": "generation_error",
            "error_type": "unknown",
            "answer": "An error occurred while generating the answer.",
            "citations": []
        }

@router.get("/api/guide/questions")
def get_guide_questions():
    return get_all_questions()

class GuideAnswerRequest(BaseModel):
    question_id: str

MARKETS = [
    {"country": "France", "expert": "Dr. Jean Martin"},
    {"country": "Germany", "expert": "Anna Keller"},
    {"country": "United Kingdom", "expert": "Dr. Emily Carter"}
]

@router.post("/api/guide/answer")
def guide_answer(request: GuideAnswerRequest, rag: RAGService = Depends(get_rag_service)):
    question = get_question_by_id(request.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")

    market_responses = []
    
    for market in MARKETS:
        country = market["country"]
        expert = market["expert"]
        
        # Per-market retrieval and generation
        rag_response = rag.process_query(
            query=question.question_text,
            filters={"country": country},
            top_k=3
        )
        
        market_responses.append({
            "country": country,
            "expert": expert,
            "answer": rag_response["answer"],
            "evidence_count": len(rag_response["citations"]),
            "citations": rag_response["citations"]
        })

    return {
        "question_id": question.question_id,
        "question": question.question_text,
        "markets": market_responses
    }

class ComparisonRequest(BaseModel):
    question_id: str
    markets: List[str]

@router.post("/api/comparison")
def comparison_answer(request: ComparisonRequest, rag: RAGService = Depends(get_rag_service)):
    question = get_question_by_id(request.question_id)
    if not question:
        raise HTTPException(status_code=404, detail="Question not found")
        
    try:
        response = rag.process_comparison(
            query=question.question_text,
            markets=request.markets,
            top_k=3
        )
        response["question_id"] = request.question_id
        return response
    except Exception as e:
        logger.error(f"Error processing comparison: {e}")
        return {
            "status": "generation_error",
            "error_type": "unknown",
            "question_id": request.question_id,
            "common_themes": [],
            "differences": []
        }

@router.get("/api/evidence/{chunk_id}")
def get_evidence(chunk_id: str, rag: RAGService = Depends(get_rag_service)):
    db = rag.db
    chunk_meta = db.get_chunk_meta(chunk_id)
    if not chunk_meta:
        raise HTTPException(status_code=404, detail="Evidence not found")
        
    source_file = chunk_meta.get("source_file")
    start_order = chunk_meta.get("source_order")
    
    # Path traversal protection
    if not source_file or "/" in source_file or "\\" in source_file or ".." in source_file:
        raise HTTPException(status_code=400, detail="Invalid source file")
        
    file_path = os.path.join("data", source_file)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Source file not found")
        
    try:
        transcript = parse_transcript(file_path)
    except Exception as e:
        logger.error(f"Failed to parse transcript {source_file}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
        
    target_turns = []
    source_turn_ids = []
    for i in range(start_order, len(transcript.turns)):
        turn = transcript.turns[i]
        target_turns.append({
            "speaker": turn.speaker,
            "text": turn.original_text,
            "timestamp": turn.timestamp_start
        })
        source_turn_ids.append(turn.turn_id)
        if turn.speaker != "Interviewer":
            break
            
    prev_turn = transcript.turns[start_order - 1] if start_order > 0 else None
    next_index = start_order + len(target_turns)
    next_turn = transcript.turns[next_index] if next_index < len(transcript.turns) else None
    
    return {
        "chunk_id": chunk_id,
        "transcript_id": chunk_meta.get("transcript_id"),
        "expert_name": chunk_meta.get("expert_name"),
        "role": chunk_meta.get("role"),
        "country": chunk_meta.get("country"),
        "timestamp_start": chunk_meta.get("timestamp_start"),
        "source_file": source_file,
        "source_order": start_order,
        "source_turn_ids": source_turn_ids,
        "previous_turn": {
            "speaker": prev_turn.speaker,
            "text": prev_turn.original_text,
            "timestamp": prev_turn.timestamp_start
        } if prev_turn else None,
        "target_turns": target_turns,
        "next_turn": {
            "speaker": next_turn.speaker,
            "text": next_turn.original_text,
            "timestamp": next_turn.timestamp_start
        } if next_turn else None
    }
