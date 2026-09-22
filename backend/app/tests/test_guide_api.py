from fastapi.testclient import TestClient
from app.main import app
from app.api import get_rag_service

client = TestClient(app)

class MockRAGService:
    def process_query(self, query, filters=None, top_k=3):
        # Return a mocked valid response
        return {
            "answer": f"Mock answer for {filters.get('country', 'Unknown')}",
            "citations": [
                {
                    "chunk_id": "c1", 
                    "exact_quote": "mock quote", 
                    "expert_name": "Dr. Expert", 
                    "country": filters.get('country'),
                    "timestamp_start": "00:00",
                    "source_file": "mock.txt"
                }
            ],
            "insufficient_evidence": False
        }

import pytest

@pytest.fixture(autouse=True)
def override_rag():
    app.dependency_overrides[get_rag_service] = MockRAGService
    yield
    app.dependency_overrides.clear()

def test_get_guide_questions():
    response = client.get("/api/guide/questions")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 6
    assert data[0]["question_id"] == "Q1"

def test_post_guide_answer():
    response = client.post("/api/guide/answer", json={"question_id": "Q2"})
    assert response.status_code == 200
    data = response.json()
    
    assert data["question_id"] == "Q2"
    assert len(data["markets"]) == 3
    
    countries = [m["country"] for m in data["markets"]]
    assert "France" in countries
    assert "Germany" in countries
    assert "United Kingdom" in countries
    
    # Check that each market got a specific generated answer
    for market in data["markets"]:
        assert market["evidence_count"] == 1
        assert "Mock answer for" in market["answer"]

def test_post_guide_answer_invalid_id():
    response = client.post("/api/guide/answer", json={"question_id": "Q999"})
    assert response.status_code == 404
