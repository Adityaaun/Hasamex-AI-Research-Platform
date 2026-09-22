import pytest
from app.db import VectorStoreService

@pytest.fixture
def db():
    return VectorStoreService()

def test_retrieval_semantic_search(db):
    results = db.search_chunks("What are the main barriers?", top_k=3)
    assert len(results) == 3
    # Check if the returned documents actually contain barrier-related terms (cost, budget, training)
    combined_text = " ".join([r['original_text'].lower() for r in results])
    assert "cost" in combined_text or "budget" in combined_text or "training" in combined_text or "funding" in combined_text

def test_retrieval_country_filter(db):
    results = db.search_chunks("How important is ROI?", top_k=5, where_filter={"country": "Germany"})
    assert len(results) > 0
    for r in results:
        assert r['metadata']['country'] == "Germany"

def test_retrieval_expert_filter(db):
    results = db.search_chunks("adoption", top_k=5, where_filter={"expert_name": "Dr. Emily Carter"})
    assert len(results) > 0
    for r in results:
        assert r['metadata']['expert_name'] == "Dr. Emily Carter"
