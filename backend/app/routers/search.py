from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
from app.models.user import User
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/search", tags=["search"])

HEADERS = {"User-Agent": "Rahnuma/1.0 (Riphah International University AI Assistant)"}


class SearchRequest(BaseModel):
    query: str
    max_results: int = 5


class SearchResult(BaseModel):
    title: str
    body: str
    href: str


@router.post("", response_model=list[SearchResult])
async def web_search(
    data: SearchRequest,
    current_user: User = Depends(get_current_user),
):
    """Free DuckDuckGo instant answer search — no API key required."""
    if not data.query.strip():
        raise HTTPException(status_code=422, detail="Query cannot be empty")

    results: list[SearchResult] = []

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            r = await client.get(
                "https://api.duckduckgo.com/",
                params={
                    "q": data.query,
                    "format": "json",
                    "no_html": "1",
                    "skip_disambig": "1",
                    "no_redirect": "1",
                },
                headers=HEADERS,
            )
            if r.status_code == 200:
                ddg = r.json()

                # Instant answer / abstract
                if ddg.get("AbstractText"):
                    results.append(SearchResult(
                        title=ddg.get("Heading") or data.query,
                        body=ddg["AbstractText"],
                        href=ddg.get("AbstractURL") or "",
                    ))

                # Answer box
                if ddg.get("Answer") and not results:
                    results.append(SearchResult(
                        title=data.query,
                        body=ddg["Answer"],
                        href="",
                    ))

                # Related topics
                for topic in ddg.get("RelatedTopics", []):
                    if len(results) >= data.max_results:
                        break
                    if isinstance(topic, dict) and topic.get("Text"):
                        results.append(SearchResult(
                            title=topic["Text"][:80],
                            body=topic["Text"],
                            href=topic.get("FirstURL") or "",
                        ))
    except Exception:
        pass  # Search is best-effort; caller handles empty results gracefully

    return results[:data.max_results]
