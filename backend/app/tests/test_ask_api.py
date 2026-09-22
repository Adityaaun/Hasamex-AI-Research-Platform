import pytest
from app.rag import RAGService
from app.gemini import GeminiService, GeminiResponse, EvidenceCitation
from typing import Dict, Any, List
from unittest.mock import MagicMock

class MockGeminiServiceAsk(GeminiService):
    def __init__(self, response_mock: GeminiResponse):
        self.response_mock = response_mock
        self.should_timeout = False
        
    def generate_answer(self, query: str, chunks: List[dict]) -> GeminiResponse:
        if self.should_timeout:
            raise Exception("timed out after 60s")
        return self.response_mock

def get_mock_db():
    db = MagicMock()
    
    def mock_search(query, top_k, where_filter):
        chunks = []
        if where_filter is None or where_filter.get("country") == "France":
            chunks.append({"chunk_id": "chunk_FR_1", "original_text": "French adoption is slow.", "metadata": {"country": "France", "expert_name": "Dr. Jean Martin"}})
        if where_filter is None or where_filter.get("country") == "Germany":
            chunks.append({"chunk_id": "chunk_DE_1", "original_text": "German adoption is fast.", "metadata": {"country": "Germany", "expert_name": "Anna Keller"}})
        if where_filter is None or where_filter.get("country") == "United Kingdom":
            chunks.append({"chunk_id": "chunk_UK_1", "original_text": "UK adoption is steady.", "metadata": {"country": "United Kingdom", "expert_name": "Dr. Emily Carter"}})
        
        # Simulate empty retrieval for specific exact queries
        if query == "Empty":
            return []
            
        return chunks
        
    db.search_chunks = mock_search
    return db

def test_ask_all_markets_valid():
    db = get_mock_db()
    
    # Mocking Gemini successfully returning an answer citing FR and DE
    mock_response = GeminiResponse(
        answer="Adoption varies.",
        evidence=[
            EvidenceCitation(chunk_id="chunk_FR_1", claim="foo", quote="French adoption is slow."),
            EvidenceCitation(chunk_id="chunk_DE_1", claim="foo", quote="German adoption is fast.")
        ],
        insufficient_evidence=False
    )
    
    rag = RAGService(db, MockGeminiServiceAsk(mock_response))
    result = rag.process_query("How is adoption?", filters=None)
    
    assert result["status"] == "success"
    assert result["answer"] == "Adoption varies."
    assert len(result["citations"]) == 2
    assert result["citations"][0]["country"] == "France"
    assert result["citations"][1]["country"] == "Germany"

def test_ask_country_filter():
    db = get_mock_db()
    
    # If filtered to UK, db will only return UK chunk. 
    # Let's say Gemini uses it.
    mock_response = GeminiResponse(
        answer="UK is steady.",
        evidence=[EvidenceCitation(chunk_id="chunk_UK_1", claim="foo", quote="UK adoption is steady.")],
        insufficient_evidence=False
    )
    
    rag = RAGService(db, MockGeminiServiceAsk(mock_response))
    result = rag.process_query("How is adoption?", filters={"country": "United Kingdom"})
    
    assert result["status"] == "success"
    assert len(result["citations"]) == 1
    assert result["citations"][0]["country"] == "United Kingdom"

def test_ask_generation_error():
    db = get_mock_db()
    
    mock_gemini = MockGeminiServiceAsk(GeminiResponse(answer="", evidence=[], insufficient_evidence=False))
    mock_gemini.should_timeout = True
    
    rag = RAGService(db, mock_gemini)
    result = rag.process_query("How is adoption?", filters=None)
    
    assert result["status"] == "generation_error"
    assert result["error_type"] == "timeout"
    assert len(result["citations"]) == 0

def test_ask_insufficient_evidence_from_retrieval():
    db = get_mock_db()
    
    mock_gemini = MockGeminiServiceAsk(GeminiResponse(answer="", evidence=[], insufficient_evidence=False))
    
    rag = RAGService(db, mock_gemini)
    result = rag.process_query("Empty", filters=None) # Empty triggers mock db to return []
    
    assert result["status"] == "insufficient_evidence"
    assert len(result["citations"]) == 0

def test_ask_insufficient_evidence_from_llm():
    db = get_mock_db()
    
    mock_response = GeminiResponse(
        answer="I don't know.",
        evidence=[],
        insufficient_evidence=True
    )
    
    rag = RAGService(db, MockGeminiServiceAsk(mock_response))
    result = rag.process_query("How is adoption?", filters=None)
    
    assert result["status"] == "insufficient_evidence"
    assert len(result["citations"]) == 0
