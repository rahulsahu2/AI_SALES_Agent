import httpx
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import KnowledgeBase, KnowledgeDocument, KnowledgeChunk, Organization
from app.core.security import decrypt_secret

class RAGService:
    @staticmethod
    def chunk_text(text: str, chunk_size: int = 600, overlap: int = 120) -> List[str]:
        """
        Splits text into overlapping chunks.
        """
        if not text:
            return []
        chunks = []
        start = 0
        while start < len(text):
            end = start + chunk_size
            chunks.append(text[start:end])
            start += chunk_size - overlap
        return chunks

    @staticmethod
    async def get_embedding(text: str, api_key: Optional[str] = None) -> List[float]:
        """
        Generates 1536-dimensional vector embedding using OpenAI.
        If no API Key is available, falls back to a mock 1536 vector for testing.
        """
        if not api_key:
            # Return dummy 1536 float array for local testing
            return [0.0] * 1536
            
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    "https://api.openai.com/v1/embeddings",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={"input": text, "model": "text-embedding-3-small"}
                )
                if response.status_code == 200:
                    data = response.json()
                    return data["data"][0]["embedding"]
            except Exception:
                pass
        return [0.0] * 1536

    @classmethod
    async def process_and_index_document(
        cls,
        db: AsyncSession,
        org_id: int,
        doc_id: int,
        raw_text: str
    ) -> bool:
        """
        Chunks the document text, generates vector embeddings, and stores them in DB.
        """
        # Fetch organization API key for embedding generation
        org_res = await db.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar_one_or_none()
        
        api_key = None
        if org and org.openai_api_key:
            api_key = decrypt_secret(org.openai_api_key)

        chunks = cls.chunk_text(raw_text)
        if not chunks:
            return False

        for chunk_text in chunks:
            embedding = await cls.get_embedding(chunk_text, api_key=api_key)
            db_chunk = KnowledgeChunk(
                document_id=doc_id,
                content=chunk_text,
                embedding=embedding
            )
            db.add(db_chunk)
            
        # Update document status to ready
        doc_res = await db.execute(select(KnowledgeDocument).where(KnowledgeDocument.id == doc_id))
        doc = doc_res.scalar_one_or_none()
        if doc:
            doc.status = "ready"
            db.add(doc)
            
        await db.commit()
        return True

    @classmethod
    async def search_kb(
        cls,
        db: AsyncSession,
        org_id: int,
        query: str,
        limit: int = 3
    ) -> str:
        """
        Performs semantic similarity query against the organization's knowledge base.
        """
        org_res = await db.execute(select(Organization).where(Organization.id == org_id))
        org = org_res.scalar_one_or_none()
        
        api_key = None
        if org and org.openai_api_key:
            api_key = decrypt_secret(org.openai_api_key)
            
        query_vector = await cls.get_embedding(query, api_key=api_key)

        # 1. Fetch chunks belonging to the organization's active knowledge bases
        result = await db.execute(
            select(KnowledgeChunk)
            .join(KnowledgeDocument)
            .join(KnowledgeBase)
            .where(KnowledgeBase.organization_id == org_id)
        )
        chunks = result.scalars().all()
        if not chunks:
            return ""

        # 2. In-memory similarity fallback if pgvector extension is not fully compiled.
        # This provides robust fallback compatibility out-of-the-box.
        def dot_product(v1, v2):
            if not v1 or not v2:
                return 0.0
            return sum(x * y for x, y in zip(v1, v2))

        scored_chunks = []
        for chunk in chunks:
            if chunk.embedding:
                score = dot_product(query_vector, chunk.embedding)
                scored_chunks.append((score, chunk.content))

        # Sort by similarity score descending
        scored_chunks.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored_chunks[:limit]
        
        # Merge contents
        context = "\n---\n".join([item[1] for item in top_chunks])
        return context
