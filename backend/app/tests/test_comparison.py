import pytest
from app.rag import RAGService
from app.db import VectorStoreService
from app.gemini import GeminiService, StageAExtraction, StageBSynthesis, MarketClaim, ThemeMapping
from typing import Dict, Any, List
from unittest.mock import MagicMock

class MockGeminiTwoStage(GeminiService):
    def __init__(self, stage_a_mock: Dict[str, StageAExtraction], stage_b_mock: StageBSynthesis):
        self.stage_a_mock = stage_a_mock
        self.stage_b_mock = stage_b_mock
        
    def generate_market_extraction(self, query: str, market: str, chunks: List[dict]) -> StageAExtraction:
        if market in self.stage_a_mock:
            return self.stage_a_mock[market]
        return StageAExtraction(claims=[])

    def generate_synthesis(self, query: str, market_claims: Dict[str, List[MarketClaim]]) -> StageBSynthesis:
        return self.stage_b_mock

def get_mock_db():
    db = MagicMock()
    
    def mock_search(query, top_k, where_filter):
        if where_filter.get("country") == "France":
            return [{"chunk_id": "chunk_FR_1", "original_text": "French adoption is slow.", "metadata": {"country": "France"}}]
        elif where_filter.get("country") == "Germany":
            return [{"chunk_id": "chunk_DE_1", "original_text": "German adoption is fast.", "metadata": {"country": "Germany"}}]
        elif where_filter.get("country") == "United Kingdom":
            return [{"chunk_id": "chunk_UK_1", "original_text": "UK adoption is steady.", "metadata": {"country": "United Kingdom"}}]
        return []
        
    db.search_chunks = mock_search
    return db

def test_comparison_valid_citations():
    db = get_mock_db()
    
    stage_a = {
        "France": StageAExtraction(claims=[MarketClaim(claim="slow", chunk_id="chunk_FR_1", quote="French adoption is slow.")]),
        "Germany": StageAExtraction(claims=[MarketClaim(claim="fast", chunk_id="chunk_DE_1", quote="German adoption is fast.")])
    }
    stage_b = StageBSynthesis(
        common_themes=[ThemeMapping(theme="Adoption exists", supporting_chunk_ids=["chunk_FR_1", "chunk_DE_1"])],
        differences=[]
    )
    
    rag = RAGService(db, MockGeminiTwoStage(stage_a, stage_b))
    result = rag.process_comparison("adoption", ["France", "Germany"])
    
    assert result["status"] == "success"
    assert len(result["common_themes"]) == 1
    evidence = result["common_themes"][0]["evidence"]
    assert "France" in evidence
    assert "Germany" in evidence
    assert len(evidence["France"]) == 1

def test_comparison_hallucinated_chunk_id():
    db = get_mock_db()
    
    stage_a = {
        "France": StageAExtraction(claims=[MarketClaim(claim="fake", chunk_id="chunk_FAKE_1", quote="fake quote")])
    }
    stage_b = StageBSynthesis(common_themes=[], differences=[])
    
    rag = RAGService(db, MockGeminiTwoStage(stage_a, stage_b))
    result = rag.process_comparison("adoption", ["France"])
    
    # Due to invalid chunk ID, Stage A validation strips it. 
    # With 0 valid claims across all markets, it should return insufficient evidence.
    assert result["status"] == "insufficient_evidence"

def test_comparison_invalid_quote():
    db = get_mock_db()
    
    stage_a = {
        "France": StageAExtraction(claims=[MarketClaim(claim="slow", chunk_id="chunk_FR_1", quote="French adoption is VERY VERY slow.")])
    }
    stage_b = StageBSynthesis(
        common_themes=[ThemeMapping(theme="Adoption exists", supporting_chunk_ids=["chunk_FR_1"])], 
        differences=[]
    )
    
    rag = RAGService(db, MockGeminiTwoStage(stage_a, stage_b))
    result = rag.process_comparison("adoption", ["France"])
    
    assert result["status"] == "success"
    evidence = result["common_themes"][0]["evidence"]
    # Quote hallucination should fallback to original text
    assert evidence["France"][0]["quote"] == "French adoption is slow."

def test_comparison_wrong_country():
    db = get_mock_db()
    
    # France LLM returns a chunk belonging to Germany!
    stage_a = {
        "France": StageAExtraction(claims=[MarketClaim(claim="fast", chunk_id="chunk_DE_1", quote="German adoption is fast.")])
    }
    stage_b = StageBSynthesis(common_themes=[], differences=[])
    
    rag = RAGService(db, MockGeminiTwoStage(stage_a, stage_b))
    result = rag.process_comparison("adoption", ["France"])
    
    # Difference should be removed because evidence failed the strict market map check for France
    assert result["status"] == "insufficient_evidence"

def test_comparison_generation_timeout():
    db = get_mock_db()
    
    # Mocking Gemini failure
    class TimeoutGemini(GeminiService):
        def generate_market_extraction(self, *args, **kwargs):
            raise Exception("timed out repeatedly")
            
    rag = RAGService(db, TimeoutGemini())
    result = rag.process_comparison("adoption", ["France"])
    
    assert result["status"] == "generation_error"
    assert result["error_type"] == "timeout"

def test_theme_drops_without_evidence():
    db = get_mock_db()
    
    stage_a = {
        "France": StageAExtraction(claims=[MarketClaim(claim="slow", chunk_id="chunk_FR_1", quote="French adoption is slow.")])
    }
    # Stage B invents a theme but cites a chunk that wasn't extracted (e.g. LLM hallucinated an ID)
    stage_b = StageBSynthesis(
        common_themes=[ThemeMapping(theme="Fake theme", supporting_chunk_ids=["chunk_FAKE_2"])], 
        differences=[]
    )
    
    rag = RAGService(db, MockGeminiTwoStage(stage_a, stage_b))
    result = rag.process_comparison("adoption", ["France"])
    
    assert result["status"] == "success"
    # The theme should be dropped entirely since it has no valid evidence attached
    assert len(result["common_themes"]) == 0
