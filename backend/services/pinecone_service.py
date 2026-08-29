import hashlib
import math
import logging
from typing import List, Dict, Any, Optional
from pinecone import Pinecone
from core.config import settings

logger = logging.getLogger("hissaby.pinecone")

class PineconeService:
    def __init__(self):
        self.api_key = settings.PINECONE_API_KEY
        self.index_name = settings.PINECONE_INDEX_NAME or "vectors"
        self.pc = None
        self.index = None
        self.dimension = 384
        
        if self.api_key:
            try:
                self.pc = Pinecone(api_key=self.api_key)
                self.index = self.pc.Index(self.index_name)
                logger.info(f"Connected to Pinecone Index: '{self.index_name}' successfully.")
            except Exception as e:
                logger.error(f"Failed to connect to Pinecone: {e}")

    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate a normalized 384-dimensional vector embedding.
        Uses deterministic semantic n-gram hash projection with unit norm.
        """
        dim = self.dimension
        vec = [0.0] * dim
        clean_text = text.lower().strip()
        if not clean_text:
            return vec

        words = clean_text.split()
        for i, word in enumerate(words):
            h = int(hashlib.sha256(word.encode('utf-8')).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 8) & 1) == 0 else -1.0
            vec[idx] += sign * (1.0 + (1.0 / (i + 1)))

        # Character trigrams for morphological semantics
        for j in range(len(clean_text) - 2):
            tri = clean_text[j:j+3]
            h = int(hashlib.md5(tri.encode('utf-8')).hexdigest(), 16)
            idx = h % dim
            sign = 1.0 if ((h >> 4) & 1) == 0 else -1.0
            vec[idx] += sign * 0.5

        # L2 Unit Normalization (Cosine Metric requirement)
        norm = math.sqrt(sum(x * x for x in vec))
        if norm > 0.0:
            vec = [x / norm for x in vec]
        return vec

    def upsert_document_chunks(
        self, 
        uid: str, 
        doc_id: str, 
        filename: str, 
        chunks: List[str]
    ) -> bool:
        """
        Upsert document chunks into the Pinecone index with per-user isolation metadata.
        """
        if not self.index:
            logger.warning("Pinecone index is not initialized. Skipping vector upsert.")
            return False

        try:
            vectors_to_upsert = []
            for idx, chunk in enumerate(chunks):
                vec_id = f"{uid}_{doc_id}_{idx}"
                embedding = self.generate_embedding(chunk)
                vectors_to_upsert.append({
                    "id": vec_id,
                    "values": embedding,
                    "metadata": {
                        "userId": uid,
                        "filename": filename,
                        "chunkIndex": idx,
                        "text": chunk[:1000]
                    }
                })

            # Upsert in batches
            self.index.upsert(vectors=vectors_to_upsert)
            logger.info(f"Successfully upserted {len(vectors_to_upsert)} chunks to Pinecone index '{self.index_name}' for user {uid}")
            return True
        except Exception as e:
            logger.error(f"Pinecone upsert failed: {e}")
            return False

    def query_rag_context(self, uid: str, query: str, top_k: int = 4) -> List[str]:
        """
        Query Pinecone vector database for relevant chunks belonging to the user.
        """
        if not self.index:
            return []

        try:
            query_vec = self.generate_embedding(query)
            res = self.index.query(
                vector=query_vec,
                top_k=top_k,
                filter={"userId": {"$eq": uid}},
                include_metadata=True
            )

            matches = res.get("matches", [])
            chunks = []
            for m in matches:
                meta = m.get("metadata", {})
                txt = meta.get("text", "")
                fname = meta.get("filename", "")
                if txt:
                    chunks.append(f"[From document: {fname}]\n{txt}")

            return chunks
        except Exception as e:
            logger.error(f"Pinecone RAG query error: {e}")
            return []

pinecone_service = PineconeService()
