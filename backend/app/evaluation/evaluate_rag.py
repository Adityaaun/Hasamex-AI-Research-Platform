import sys
from dotenv import load_dotenv
from app.db import VectorStoreService
from app.gemini import GeminiService
from app.rag import RAGService
import json

def run_evaluation():
    load_dotenv()
    db = VectorStoreService()
    llm = GeminiService()
    rag = RAGService(db, llm)

    test_cases = [
        {
            "question": "What are the main barriers to adoption?",
            "filters": None
        },
        {
            "question": "How important is ROI in Germany?",
            "filters": {"country": "Germany"}
        },
        {
            "question": "What is the current market share of robotic surgery companies in Europe?",
            "filters": None
        }
    ]

    print("=== Hasamex RAG Evaluation ===")
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n--- Test Case {i} ---")
        print(f"Question: {test['question']}")
        print(f"Filters: {test['filters']}")
        
        # We manually do retrieval to print it out as requested: "Retrieved evidence"
        retrieved = db.search_chunks(test['question'], top_k=3, where_filter=test['filters'])
        print(f"\n[Retrieved Evidence IDs]: {[c['chunk_id'] for c in retrieved]}")
        
        # Run full pipeline
        response = rag.process_query(test['question'], filters=test['filters'], top_k=3)
        
        print(f"\n[Generated Answer]:")
        print(response['answer'])
        
        print(f"\n[Insufficient Evidence Flag]: {response['insufficient_evidence']}")
        
        print(f"\n[Citations]:")
        print(json.dumps(response['citations'], indent=2))
        print("-" * 40)

if __name__ == "__main__":
    run_evaluation()
