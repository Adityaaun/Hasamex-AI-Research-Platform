from typing import List, Optional, Dict
from pydantic import BaseModel
from google import genai
from google.genai import types
from .config import settings
import logging

logger = logging.getLogger(__name__)

class EvidenceCitation(BaseModel):
    chunk_id: str
    claim: str
    quote: str

class MarketClaim(BaseModel):
    claim: str
    chunk_id: str
    quote: str

class StageAExtraction(BaseModel):
    claims: List[MarketClaim]

class ThemeMapping(BaseModel):
    theme: str
    supporting_chunk_ids: List[str]

class StageBSynthesis(BaseModel):
    common_themes: List[ThemeMapping]
    differences: List[ThemeMapping]

class GeminiResponse(BaseModel):
    answer: str
    evidence: List[EvidenceCitation]
    insufficient_evidence: bool

class GeminiService:
    def __init__(self):
        self.model_name = settings.GEMINI_MODEL
        self.client = None
        
        api_key = settings.GEMINI_API_KEY
        if not api_key or api_key == "your_api_key_here":
            logger.warning("GEMINI_API_KEY is not set or invalid. Gemini calls will fail.")
        else:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {e}")

    def build_system_prompt(self) -> str:
        return """You are an evidence-grounded research assistant.
Answer ONLY using the provided evidence.
Do not use outside knowledge.
Do not invent facts.
Do not invent timestamps.
Do not invent experts.
Do not invent quotations.
Every substantive claim must be supported by one or more provided evidence IDs.
If the evidence does not adequately support the answer, set `insufficient_evidence` to true and return: "Insufficient evidence in the provided transcripts to answer this question reliably." in the `answer` field.
Do not fill gaps with assumptions.
Do not treat an inference as a direct quote.
"""

    def format_evidence(self, retrieved_chunks: List[dict]) -> str:
        formatted = []
        for chunk in retrieved_chunks:
            meta = chunk['metadata']
            formatted.append(
                f'<EVIDENCE id="{chunk["chunk_id"]}">\n'
                f'  <EXPERT>{meta.get("expert_name", "Unknown")}</EXPERT>\n'
                f'  <COUNTRY>{meta.get("country", "Unknown")}</COUNTRY>\n'
                f'  <TIMESTAMP>{meta.get("timestamp_start", "Unknown")}</TIMESTAMP>\n'
                f'  <TEXT>{chunk["original_text"]}</TEXT>\n'
                f'</EVIDENCE>'
            )
        return "\n\n".join(formatted)

    def generate_answer(self, query: str, retrieved_chunks: List[dict]) -> GeminiResponse:
        if not self.client:
            raise Exception("Gemini API key is missing or invalid. Cannot generate answer.")
            
        system_instruction = self.build_system_prompt()
        evidence_text = self.format_evidence(retrieved_chunks)
        
        prompt = f"Evidence:\n{evidence_text}\n\nQuestion:\n{query}"
        
        try:
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=GeminiResponse,
                    temperature=0.0,
                ),
            )
            # Response is a parsed Pydantic object when response_schema is provided via genai SDK
            return response.parsed
        except Exception as e:
            logger.error(f"[GEMINI ERROR] {str(e)}")
            raise e


    def generate_market_extraction(self, query: str, market: str, chunks: List[dict]) -> StageAExtraction:
        evidence_text = "\n\n".join(
            [f"--- Chunk ID: {c['chunk_id']} ---\n{c['original_text']}" for c in chunks]
        )
        
        system_instruction = (
            f"You are a qualitative research assistant. Extract key claims from the {market} market experts regarding the question.\n"
            "Constraints:\n"
            "1. Extract maximum 2 claims.\n"
            "2. For each claim, provide the chunk_id and an EXACT quote from the chunk that supports it.\n"
            "3. If there is no relevant information, return an empty list."
        )
        
        prompt = f"Evidence:\n{evidence_text}\n\nQuestion:\n{query}"
        
        import time
        import concurrent.futures
        
        max_retries = 1
        timeout_seconds = 60.0
        
        def _call_gemini():
            return self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=StageAExtraction,
                    temperature=0.2,
                ),
            )
            
        for attempt in range(max_retries + 1):
            try:
                start_time = time.time()
                executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                future = executor.submit(_call_gemini)
                response = future.result(timeout=timeout_seconds)
                executor.shutdown(wait=False)
                
                duration = time.time() - start_time
                logger.info(f"[GEMINI] Stage A ({market}) generation took {duration:.2f} seconds.")
                return response.parsed
            except concurrent.futures.TimeoutError:
                logger.error(f"[GEMINI ERROR] Stage A ({market}) Attempt {attempt + 1} timed out after {timeout_seconds}s.")
                if attempt < max_retries:
                    logger.info("[GEMINI] Retrying Stage A generation...")
                    time.sleep(2)
                else:
                    raise Exception(f"Gemini Stage A ({market}) timed out repeatedly.")
            except Exception as e:
                logger.error(f"[GEMINI ERROR] Stage A ({market}) Attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries:
                    logger.info("[GEMINI] Retrying Stage A generation...")
                    time.sleep(2)
                else:
                    raise e

    def generate_synthesis(self, query: str, market_claims: Dict[str, List[MarketClaim]]) -> StageBSynthesis:
        evidence_lines = []
        for market, claims in market_claims.items():
            evidence_lines.append(f"\n{market.upper()}:")
            for c in claims:
                evidence_lines.append(f"- [ID: {c.chunk_id}] {c.claim}")
        
        evidence_text = "\n".join(evidence_lines)
        
        system_instruction = (
            "You are a qualitative research assistant. Synthesize the provided market claims into common themes and differences.\n"
            "RULES:\n"
            "1. Compare only the supplied market claims. Do not infer market-level facts beyond the interviews.\n"
            "2. Do not rank markets (e.g., do not say one is 'better' or 'worse').\n"
            "3. Do not use comparative intensity words (more, less, stronger, weaker, primarily) unless directly supported by the evidence.\n"
            "4. Prefer descriptive differences over evaluative comparisons.\n"
            "5. A common theme must have evidence from the markets it claims to represent.\n"
            "6. Do not manufacture a consensus from partial evidence.\n"
            "7. Distinguish clearly between: common theme, market-specific observation, difference, and insufficient evidence.\n"
            "8. Output maximum 3 common_themes and maximum 3 differences.\n"
            "9. For each theme or difference, your `supporting_chunk_ids` array MUST ONLY contain the specific chunk IDs that directly support that theme. Do NOT blindly copy all chunk IDs. If a claim does not support the theme, do not include its ID."
        )
        
        prompt = f"Market Claims:\n{evidence_text}\n\nQuestion:\n{query}"
        
        import time
        import concurrent.futures
        
        max_retries = 1
        timeout_seconds = 60.0
        
        def _call_gemini():
            return self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    response_mime_type="application/json",
                    response_schema=StageBSynthesis,
                    temperature=0.2,
                ),
            )
            
        for attempt in range(max_retries + 1):
            try:
                start_time = time.time()
                executor = concurrent.futures.ThreadPoolExecutor(max_workers=1)
                future = executor.submit(_call_gemini)
                response = future.result(timeout=timeout_seconds)
                executor.shutdown(wait=False)
                
                duration = time.time() - start_time
                logger.info(f"[GEMINI] Stage B generation took {duration:.2f} seconds.")
                return response.parsed
            except concurrent.futures.TimeoutError:
                logger.error(f"[GEMINI ERROR] Stage B Attempt {attempt + 1} timed out after {timeout_seconds}s.")
                if attempt < max_retries:
                    logger.info("[GEMINI] Retrying Stage B generation...")
                    time.sleep(2)
                else:
                    raise Exception("Gemini Stage B timed out repeatedly.")
            except Exception as e:
                logger.error(f"[GEMINI ERROR] Stage B Attempt {attempt + 1} failed: {str(e)}")
                if attempt < max_retries:
                    logger.info("[GEMINI] Retrying Stage B generation...")
                    time.sleep(2)
                else:
                    raise e
