import pytest
from app.rag import RAGService
from app.gemini import GeminiResponse, EvidenceCitation

class MockVectorStore:
    def search_chunks(self, query, top_k=5, where_filter=None):
        return [
            {
                "chunk_id": "chunk_123",
                "original_text": "[01:20] Dr. Martin: The biggest issue is still capital budget approval.",
                "metadata": {
                    "expert_name": "Dr. Jean Martin",
                    "country": "France",
                    "timestamp_start": "01:20",
                    "source_file": "transcript_expert1.txt"
                }
            }
        ]

class MockGeminiService:
    def __init__(self):
        self.mock_response = None
        
    def generate_answer(self, query, retrieved_chunks):
        return self.mock_response

@pytest.fixture
def rag():
    return RAGService(MockVectorStore(), MockGeminiService())

def test_valid_evidence_and_quote(rag):
    rag.llm.mock_response = GeminiResponse(
        answer="Budget is an issue.",
        evidence=[EvidenceCitation(chunk_id="chunk_123", claim="Budget", quote="capital budget approval")],
        insufficient_evidence=False
    )
    result = rag.process_query("What is the issue?")
    assert result["status"] == "success"
    assert result["answer"] == "Budget is an issue."
    assert len(result["citations"]) == 1
    assert result["citations"][0]["chunk_id"] == "chunk_123"
    assert result["citations"][0]["exact_quote"] == "capital budget approval" # Preserved exact quote

def test_invalid_evidence_id(rag):
    rag.llm.mock_response = GeminiResponse(
        answer="Budget is an issue.",
        evidence=[EvidenceCitation(chunk_id="chunk_FAKE", claim="Budget", quote="capital budget approval")],
        insufficient_evidence=False
    )
    result = rag.process_query("What is the issue?")
    # ID should be rejected, resulting in 0 citations
    assert len(result["citations"]) == 0

def test_hallucinated_quote_fallback(rag):
    rag.llm.mock_response = GeminiResponse(
        answer="Budget is an issue.",
        # "money is tight" is not in the original text
        evidence=[EvidenceCitation(chunk_id="chunk_123", claim="Budget", quote="money is tight")],
        insufficient_evidence=False
    )
    result = rag.process_query("What is the issue?")
    assert len(result["citations"]) == 1
    # Because quote hallucinated, the backend should fallback to providing the full original_text
    assert result["citations"][0]["exact_quote"] == "[01:20] Dr. Martin: The biggest issue is still capital budget approval."

def test_unsupported_answer(rag):
    rag.llm.mock_response = GeminiResponse(
        answer="Insufficient evidence in the provided transcripts to answer this question reliably.",
        evidence=[],
        insufficient_evidence=True
    )
    result = rag.process_query("Market share of robots?")
    assert result["status"] == "insufficient_evidence"
    assert result["answer"] == "Insufficient evidence in the provided transcripts to answer this question reliably."

def test_empty_retrieval(rag):
    class EmptyMockVectorStore:
        def search_chunks(self, query, top_k=5, where_filter=None):
            return []
    
    empty_rag = RAGService(EmptyMockVectorStore(), MockGeminiService())
    result = empty_rag.process_query("Anything?")
    assert result["status"] == "insufficient_evidence"
    assert len(result["citations"]) == 0
