"""
ChromaDB vector memory for Rahnuma.
Stores message embeddings and retrieves relevant context for each conversation turn.
Falls back gracefully if ChromaDB is not installed or the model has not downloaded yet.
"""
from __future__ import annotations
import os
from app.config import settings

_client = None
_ef = None
_ready = False


def _init():
    global _client, _ef, _ready
    if _ready:
        return True
    try:
        import chromadb
        from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
        os.makedirs(settings.CHROMA_PATH, exist_ok=True)
        _client = chromadb.PersistentClient(path=settings.CHROMA_PATH)
        _ef = DefaultEmbeddingFunction()
        _ready = True
        print("[ChromaDB] Vector memory ready at", settings.CHROMA_PATH)
        return True
    except Exception as e:
        print(f"[ChromaDB] Not available (non-fatal): {e}")
        return False


def _collection(user_id: int):
    if not _ready:
        return None
    return _client.get_or_create_collection(
        name=f"user_{user_id}",
        embedding_function=_ef,
        metadata={"hnsw:space": "cosine"},
    )


def store_exchange(user_id: int, exchange_id: str, question: str, answer: str):
    """Store a Q&A exchange in the user's vector collection."""
    if not _init():
        return
    try:
        col = _collection(user_id)
        if not col:
            return
        text = f"Q: {question}\nA: {answer}"
        col.upsert(
            ids=[exchange_id],
            documents=[text],
            metadatas=[{"user_id": user_id, "question": question[:200]}],
        )
    except Exception as e:
        print(f"[ChromaDB] store error: {e}")


def retrieve_context(user_id: int, query: str, n: int = 3) -> str:
    """Return relevant past exchanges as a formatted context block."""
    if not _init():
        return ""
    try:
        col = _collection(user_id)
        if not col or col.count() == 0:
            return ""
        results = col.query(query_texts=[query], n_results=min(n, col.count()))
        docs = results.get("documents", [[]])[0]
        if not docs:
            return ""
        formatted = "\n---\n".join(docs)
        return f"\n\n## Relevant Memory\n{formatted}\n"
    except Exception as e:
        print(f"[ChromaDB] retrieve error: {e}")
        return ""
