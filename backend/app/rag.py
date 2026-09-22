from typing import List, Dict, Any
from .db import VectorStoreService
from .gemini import GeminiService, GeminiResponse
import logging

logger = logging.getLogger(__name__)

class RAGService:
    def __init__(self, db: VectorStoreService, llm: GeminiService):
        self.db = db
        self.llm = llm

    def process_query(self, query: str, filters: dict = None, top_k: int = 5) -> Dict[str, Any]:
        # 1. Retrieval
        retrieved_chunks = self.db.search_chunks(query, top_k=top_k, where_filter=filters)
        if not retrieved_chunks:
            return {
                "status": "insufficient_evidence",
                "answer": "Insufficient evidence in the provided transcripts to answer this question reliably.",
                "citations": []
            }

        # 2. LLM Generation
        try:
            llm_response = self.llm.generate_answer(query, retrieved_chunks)
        except Exception as e:
            return {
                "status": "generation_error",
                "error_type": "timeout" if "timed out" in str(e).lower() else "unknown",
                "answer": "An error occurred while generating the answer.",
                "citations": []
            }

        if llm_response.insufficient_evidence:
            return {
                "status": "insufficient_evidence",
                "answer": "Insufficient evidence in the provided transcripts to answer this question reliably.",
                "citations": []
            }

        # 3. Backend Validation (IDs and Quotes)
        final_citations = self._validate_and_build_citations(llm_response, retrieved_chunks)

        return {
            "status": "success",
            "answer": llm_response.answer,
            "citations": final_citations
        }

    def _validate_and_build_citations(self, llm_response: GeminiResponse, retrieved_chunks: List[dict]) -> List[dict]:
        chunk_map = {c['chunk_id']: c for c in retrieved_chunks}
        final_citations = []

        for evidence in llm_response.evidence:
            # Step 1: Validate ID
            if evidence.chunk_id not in chunk_map:
                logger.warning(f"Validation failed: Unknown chunk_id {evidence.chunk_id}")
                continue # Reject hallucinated ID
            
            source_chunk = chunk_map[evidence.chunk_id]
            original_text = source_chunk['original_text']
            meta = source_chunk['metadata']
            
            # Step 2: Validate exact quote
            final_quote = evidence.quote
            if evidence.quote and evidence.quote not in original_text:
                logger.warning(f"Validation failed: Quote hallucination detected for chunk {evidence.chunk_id}. Fallback to original text.")
                # Fallback: We can't trust the LLM's quote. We return the original chunk text instead.
                final_quote = f"[Exact quote could not be validated; showing the verified source passage.]\n\n{original_text}"

            # Step 3: Construct citation objects
            citation = {
                "chunk_id": evidence.chunk_id,
                "expert_name": meta.get("expert_name"),
                "country": meta.get("country"),
                "timestamp_start": meta.get("timestamp_start"),
                "exact_quote": final_quote,
                "source_file": meta.get("source_file")
            }
            final_citations.append(citation)

        return final_citations

    def process_comparison(self, query: str, markets: List[str], top_k: int = 2) -> Dict[str, Any]:
        import time
        logger.info(f"\n[PERF] Starting two-stage comparison for question: {query}")
        
        # 1. Independent Retrieval per Market
        evidence_map = {}
        total_chunks = 0
        total_chars = 0
        market_chunk_maps = {}
        
        for market in markets:
            chunks = self.db.search_chunks(query, top_k=top_k, where_filter={"country": market})
            evidence_map[market] = chunks
            market_chunk_maps[market] = {c['chunk_id']: c for c in chunks}
            total_chunks += len(chunks)
            total_chars += sum(len(c['original_text']) for c in chunks)
            chunk_ids = [c['chunk_id'] for c in chunks]
            logger.info(f"[PERF] Market {market}: Retrieved {len(chunks)} chunks -> {chunk_ids}")
            
        logger.info(f"[PERF] Total retrieved: {total_chunks} chunks, {total_chars} characters.")
        
        if not any(evidence_map.values()):
            return {
                "status": "insufficient_evidence",
                "error_type": None,
                "question": query,
                "common_themes": [],
                "differences": []
            }

        # 2. Stage A - Market Extraction (Parallel)
        valid_market_claims = {}
        
        import concurrent.futures
        
        def process_market(market: str, chunks: list):
            try:
                stage_a_response = self.llm.generate_market_extraction(query, market, chunks)
                # Validation immediately
                valid_claims_for_market = []
                for claim in stage_a_response.claims:
                    if claim.chunk_id not in market_chunk_maps[market]:
                        logger.warning(f"Validation failed: chunk_id {claim.chunk_id} not in {market} chunks")
                        continue
                        
                    source_chunk = market_chunk_maps[market][claim.chunk_id]
                    original_text = source_chunk['original_text']
                    
                    final_quote = claim.quote
                    if claim.quote and claim.quote not in original_text:
                        logger.warning(f"Validation failed: Quote hallucination for {claim.chunk_id}")
                        final_quote = f"[Exact quote could not be validated; showing the verified source passage.]\n\n{original_text}"
                        
                    valid_claims_for_market.append({
                        "claim": claim.claim,
                        "chunk_id": claim.chunk_id,
                        "quote": final_quote,
                        "market": market,
                        "expert_name": source_chunk['metadata'].get('expert_name'),
                        "timestamp_start": source_chunk['metadata'].get('timestamp_start'),
                        "country": source_chunk['metadata'].get('country'),
                        "source_file": source_chunk['metadata'].get('source_file')
                    })
                    
                return market, valid_claims_for_market
            except Exception as e:
                logger.error(f"Stage A failed for {market}: {str(e)}")
                raise e

        markets_with_chunks = {m: c for m, c in evidence_map.items() if c}
        
        if not markets_with_chunks:
            return {
                "status": "insufficient_evidence",
                "error_type": None,
                "question": query,
                "common_themes": [],
                "differences": []
            }

        try:
            with concurrent.futures.ThreadPoolExecutor(max_workers=len(markets_with_chunks)) as executor:
                future_to_market = {
                    executor.submit(process_market, market, chunks): market 
                    for market, chunks in markets_with_chunks.items()
                }
                
                for future in concurrent.futures.as_completed(future_to_market):
                    market, valid_claims = future.result()
                    if valid_claims:
                        valid_market_claims[market] = valid_claims
        except Exception as e:
            return {
                "status": "generation_error",
                "error_type": "timeout" if "timed out" in str(e).lower() else "unknown",
                "question": query,
                "common_themes": [],
                "differences": []
            }
                
        if not valid_market_claims:
            return {
                "status": "insufficient_evidence",
                "error_type": None,
                "question": query,
                "common_themes": [],
                "differences": []
            }

        # 3. Stage B - Cross-Market Synthesis
        try:
            # We must convert dict to objects for the pydantic schema in gemini
            from .gemini import MarketClaim
            stage_b_input = {
                m: [MarketClaim(**c) for c in claims] for m, claims in valid_market_claims.items()
            }
            stage_b_response = self.llm.generate_synthesis(query, stage_b_input)
        except Exception as e:
            logger.error(f"Stage B failed: {str(e)}")
            return {
                "status": "generation_error",
                "error_type": "timeout" if "timed out" in str(e).lower() else "unknown",
                "question": query,
                "common_themes": [],
                "differences": []
            }
            
        # 4. Attach evidence back to themes and differences
        # Build a flat lookup dictionary for all valid claims by chunk_id
        valid_claim_lookup = {}
        for market, claims in valid_market_claims.items():
            for c in claims:
                valid_claim_lookup[c["chunk_id"]] = c

        common_themes = []
        for theme_map in stage_b_response.common_themes:
            # Map chunk IDs back to valid claims, grouped by market
            evidence_for_theme = {}
            for cid in theme_map.supporting_chunk_ids:
                if cid in valid_claim_lookup:
                    claim_obj = valid_claim_lookup[cid]
                    mkt = claim_obj["market"]
                    if mkt not in evidence_for_theme:
                        evidence_for_theme[mkt] = []
                    evidence_for_theme[mkt].append(claim_obj)
            
            # Only add the theme if it has actual valid evidence backing it
            if evidence_for_theme:
                common_themes.append({
                    "theme": theme_map.theme,
                    "evidence": evidence_for_theme
                })
            
        differences = []
        for diff_map in stage_b_response.differences:
            evidence_for_diff = {}
            for cid in diff_map.supporting_chunk_ids:
                if cid in valid_claim_lookup:
                    claim_obj = valid_claim_lookup[cid]
                    mkt = claim_obj["market"]
                    if mkt not in evidence_for_diff:
                        evidence_for_diff[mkt] = []
                    evidence_for_diff[mkt].append(claim_obj)
            
            if evidence_for_diff:
                differences.append({
                    "theme": diff_map.theme,
                    "evidence": evidence_for_diff
                })
            
        logger.info(f"[PERF] Two-stage pipeline complete. Found {len(common_themes)} themes and {len(differences)} differences.")
        return {
            "status": "success",
            "error_type": None,
            "question": query,
            "common_themes": common_themes,
            "differences": differences
        }
