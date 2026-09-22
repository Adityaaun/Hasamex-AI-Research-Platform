import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture(autouse=True)
def clear_overrides():
    app.dependency_overrides.clear()


def test_evidence_valid_chunk():
    # First get a valid chunk_id using Chroma directly or just hit Ask and grab a citation
    # For speed, let's use the known chunk from the parser test or ChromaDB
    import chromadb
    db_client = chromadb.PersistentClient(path='./chroma_db')
    col = db_client.get_collection('evidence_chunks')
    target = col.get(limit=1)
    if not target or not target['ids']:
        pytest.skip("No chunks in DB")
        
    chunk_id = target['ids'][0]
    
    response = client.get(f"/api/evidence/{chunk_id}")
    assert response.status_code == 200
    data = response.json()
    
    assert data["chunk_id"] == chunk_id
    assert "transcript_id" in data
    assert "expert_name" in data
    assert "source_file" in data
    assert "source_order" in data
    assert "source_turn_ids" in data
    assert "target_turns" in data
    assert len(data["target_turns"]) > 0
    assert "speaker" in data["target_turns"][0]
    assert "text" in data["target_turns"][0]

def test_evidence_unknown_chunk():
    response = client.get("/api/evidence/chunk_does_not_exist")
    assert response.status_code == 404

def test_evidence_path_traversal():
    # This shouldn't be possible because the endpoint takes chunk_id and looks up source_file in Chroma.
    # We can't inject a filesystem path via the API directly.
    # But let's verify that a crafted chunk_id doesn't cause traversal.
    response = client.get("/api/evidence/../../../etc/passwd")
    assert response.status_code == 404 # Because chunk ID won't be found
