"""
OpenAI-compatible public API — authenticated with API keys (not JWT).
Endpoints:
  POST /api/v1/chat/completions
  GET  /api/v1/models
  GET  /api/v1/usage
"""
import time
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from sqlalchemy import select
from pydantic import BaseModel
from app.database import AsyncSessionLocal
from app.models.api_key import APIKey, PLAN_LIMITS, hash_key
from app.models.usage_log import UsageLog
from app.config import settings

router = APIRouter(prefix="/api/v1", tags=["v1-api"])

MODEL_NAME = "rahnuma-1"


class V1Message(BaseModel):
    role: str
    content: str


class V1ChatRequest(BaseModel):
    model: str = MODEL_NAME
    messages: list[V1Message]
    stream: bool = False
    max_tokens: int = 2048
    temperature: float = 0.7


async def _resolve_api_key(request: Request) -> APIKey:
    """Extract and validate API key from Authorization header."""
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")
    raw_key = auth[7:].strip()
    if not raw_key.startswith("sk-rph-"):
        raise HTTPException(status_code=401, detail="Invalid API key format")

    key_hash = hash_key(raw_key)
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(APIKey).where(APIKey.key_hash == key_hash))
        api_key = result.scalar_one_or_none()

    if not api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")
    if not api_key.is_active:
        raise HTTPException(status_code=403, detail="API key is disabled")

    # Check rate limits
    plan = api_key.plan or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    now = datetime.now(timezone.utc)

    # Reset daily counter if past midnight
    day_delta = (now.date() - api_key.day_reset_at.date()).days
    month_delta = (now.year - api_key.month_reset_at.year) * 12 + (now.month - api_key.month_reset_at.month)

    async with AsyncSessionLocal() as db:
        db_key = await db.get(APIKey, api_key.id)
        if day_delta >= 1:
            db_key.requests_today = 0
            db_key.day_reset_at = now
        if month_delta >= 1:
            db_key.requests_month = 0
            db_key.tokens_month = 0
            db_key.month_reset_at = now
        await db.commit()
        await db.refresh(db_key)
        api_key = db_key

    if api_key.requests_today >= limits["req_day"]:
        raise HTTPException(status_code=429, detail=f"Daily request limit ({limits['req_day']}) exceeded")
    if api_key.requests_month >= limits["req_month"]:
        raise HTTPException(status_code=429, detail=f"Monthly request limit ({limits['req_month']}) exceeded")

    return api_key


async def _log_usage(api_key: APIKey, input_tokens: int, output_tokens: int, latency_ms: int,
                     status_code: int = 200, error: str | None = None, ip: str | None = None):
    async with AsyncSessionLocal() as db:
        db_key = await db.get(APIKey, api_key.id)
        if db_key:
            db_key.requests_today += 1
            db_key.requests_month += 1
            db_key.tokens_month += input_tokens + output_tokens
            db_key.last_used_at = datetime.now(timezone.utc)
        log = UsageLog(
            api_key_id=api_key.id,
            user_id=api_key.user_id,
            endpoint="/v1/chat/completions",
            model=MODEL_NAME,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
            status_code=status_code,
            error=error,
            ip_address=ip,
        )
        db.add(log)
        await db.commit()


@router.get("/models")
async def list_models(request: Request):
    await _resolve_api_key(request)
    return {
        "object": "list",
        "data": [
            {
                "id": MODEL_NAME,
                "object": "model",
                "created": 1700000000,
                "owned_by": "rahnuma",
                "permission": [],
                "root": MODEL_NAME,
                "parent": None,
            }
        ],
    }


@router.post("/chat/completions")
async def chat_completions(req: V1ChatRequest, request: Request):
    api_key = await _resolve_api_key(request)
    ip = request.client.host if request.client else None
    start = time.time()

    # Build prompt from messages
    prompt_parts = []
    for m in req.messages:
        role_label = "User" if m.role == "user" else "Assistant" if m.role == "assistant" else "System"
        prompt_parts.append(f"{role_label}: {m.content}")
    prompt = "\n".join(prompt_parts) + "\nAssistant:"

    # Rough token estimate (4 chars ~ 1 token)
    input_tokens = sum(len(m.content) // 4 for m in req.messages)

    try:
        from app.services.llm import stream_chat
        collected = []

        if req.stream:
            async def event_stream():
                output_tokens = 0
                try:
                    async for token in stream_chat([{"role": m.role, "content": m.content} for m in req.messages]):
                        collected.append(token)
                        output_tokens += 1
                        import json
                        chunk = {
                            "id": f"chatcmpl-v1",
                            "object": "chat.completion.chunk",
                            "model": MODEL_NAME,
                            "choices": [{"index": 0, "delta": {"content": token}, "finish_reason": None}],
                        }
                        yield f"data: {json.dumps(chunk)}\n\n"
                    yield "data: [DONE]\n\n"
                finally:
                    latency = int((time.time() - start) * 1000)
                    import asyncio
                    asyncio.create_task(_log_usage(api_key, input_tokens, output_tokens, latency, 200, None, ip))

            return StreamingResponse(event_stream(), media_type="text/event-stream")

        else:
            tokens = []
            async for token in stream_chat([{"role": m.role, "content": m.content} for m in req.messages]):
                tokens.append(token)
            content = "".join(tokens)
            output_tokens = len(content) // 4
            latency = int((time.time() - start) * 1000)
            import asyncio
            asyncio.create_task(_log_usage(api_key, input_tokens, output_tokens, latency, 200, None, ip))
            import json as _json
            return JSONResponse({
                "id": "chatcmpl-v1",
                "object": "chat.completion",
                "model": MODEL_NAME,
                "choices": [{"index": 0, "message": {"role": "assistant", "content": content}, "finish_reason": "stop"}],
                "usage": {"prompt_tokens": input_tokens, "completion_tokens": output_tokens, "total_tokens": input_tokens + output_tokens},
            })
    except Exception as e:
        latency = int((time.time() - start) * 1000)
        import asyncio
        asyncio.create_task(_log_usage(api_key, input_tokens, 0, latency, 500, str(e)[:200], ip))
        raise HTTPException(status_code=500, detail="LLM error") from e


@router.get("/usage")
async def get_api_usage(request: Request):
    api_key = await _resolve_api_key(request)
    plan = api_key.plan or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    return {
        "plan": plan,
        "requests_today": api_key.requests_today,
        "requests_month": api_key.requests_month,
        "tokens_month": api_key.tokens_month,
        "limits": limits,
    }
