import chromadb
from chromadb.config import Settings
from typing import List
from .models import EvidenceChunk
import logging
import os

logger = logging.getLogger(__name__)

class VectorStoreService:
    def __init__(self, persist_directory: str = "./chroma_db"):
        self.persist_directory = persist_directory
        # For prototype, use local persistent ChromaDB
        self.client = chromadb.PersistentClient(path=self.persist_directory)
        self.collection_name = "evidence_chunks"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def index_chunks(self, chunks: List[EvidenceChunk]):
        if not chunks:
            return
            
        ids = []
        documents = []
        metadatas = []
        
        for chunk in chunks:
            ids.append(chunk.chunk_id)
            documents.append(chunk.original_text)
            metadatas.append({
                "transcript_id": chunk.transcript_id,
                "expert_name": chunk.expert_name,
                "role": chunk.role,
                "country": chunk.country,
                "speaker": chunk.speaker,
                "timestamp_start": chunk.timestamp_start,
                "source_file": chunk.source_file,
                "source_order": chunk.source_order
            })
            
        try:
            self.collection.upsert(
                ids=ids,
                documents=documents,
                metadatas=metadatas
            )
            logger.info(f"[INDEX] Successfully indexed {len(chunks)} chunks to ChromaDB.")
        except Exception as e:
            logger.error(f"[INDEX ERROR] Failed to index chunks: {str(e)}")
            raise

    def count(self) -> int:
        return self.collection.count()

    def search_chunks(self, query: str, top_k: int = 5, where_filter: dict = None) -> List[dict]:
        results = self.collection.query(
            query_texts=[query],
            n_results=top_k,
            where=where_filter
        )
        
        retrieved = []
        if results and results['ids'] and len(results['ids'][0]) > 0:
            for i in range(len(results['ids'][0])):
                retrieved.append({
                    "chunk_id": results['ids'][0][i],
                    "original_text": results['documents'][0][i],
                    "metadata": results['metadatas'][0][i]
                })
        return retrieved

    def get_chunk_meta(self, chunk_id: str) -> dict | None:
        results = self.collection.get(ids=[chunk_id])
        if results and results['ids'] and len(results['ids']) > 0:
            return results['metadatas'][0]
        return None
