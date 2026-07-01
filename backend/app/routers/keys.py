"""
API Key management — SQLite backed.
The raw key is returned ONCE on creation and never stored in plain text.
"""
import time
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.api_key import APIKey, generate_api_key, PLAN_LIMITS
from app.models.usage_log import UsageLog
from app.services.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/keys", tags=["api-keys"])


class KeyCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)


class KeyOut(BaseModel):
    id: int
    name: str
    key_prefix: str
    plan: str
    is_active: bool
    requests_today: int
    requests_month: int
    tokens_month: int
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class PlanInfo(BaseModel):
    req_day: int
    req_month: int
    tokens_month: int
    rpm: int


@router.post("", status_code=201)
async def create_api_key(
    data: KeyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Max 10 active keys per user
    count = (await db.execute(
        select(func.count()).select_from(APIKey)
        .where(APIKey.user_id == current_user.id, APIKey.is_active == True)
    )).scalar()
    if count >= 10:
        raise HTTPException(status_code=400, detail="Maximum 10 active API keys allowed")

    full_key, prefix, key_hash = generate_api_key()
    api_key = APIKey(
        user_id=current_user.id,
        name=data.name,
        key_prefix=prefix,
        key_hash=key_hash,
        plan=getattr(current_user, "plan", "free") or "free",
    )
    db.add(api_key)
    await db.commit()
    await db.refresh(api_key)

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key": full_key,           # returned ONCE — user must copy it now
        "key_prefix": prefix,
        "plan": api_key.plan,
        "created_at": api_key.created_at,
        "message": "Copy this key now — it will not be shown again.",
    }


@router.get("", response_model=list[KeyOut])
async def list_api_keys(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIKey)
        .where(APIKey.user_id == current_user.id, APIKey.is_active == True)
        .order_by(APIKey.created_at.desc())
    )
    return result.scalars().all()


@router.get("/limits")
async def get_plan_limits(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    plan = getattr(current_user, "plan", "free") or "free"
    user = await db.get(User, current_user.id)
    return {
        "plan": plan,
        "limits": PLAN_LIMITS.get(plan, PLAN_LIMITS["free"]),
        "credits_balance": getattr(user, "credits_balance", 0) or 0,
        "total_credits_purchased": getattr(user, "total_credits_purchased", 0) or 0,
    }


@router.get("/usage")
async def get_usage_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Aggregate usage stats for all the user's API keys."""
    keys_result = await db.execute(
        select(APIKey).where(APIKey.user_id == current_user.id)
    )
    keys = keys_result.scalars().all()
    total_req_today = sum(k.requests_today for k in keys)
    total_req_month = sum(k.requests_month for k in keys)
    total_tokens = sum(k.tokens_month for k in keys)

    # Last 20 usage logs
    logs_result = await db.execute(
        select(UsageLog, APIKey.name, APIKey.key_prefix)
        .join(APIKey, UsageLog.api_key_id == APIKey.id, isouter=True)
        .where(UsageLog.user_id == current_user.id)
        .order_by(UsageLog.created_at.desc())
        .limit(20)
    )
    logs = []
    for log, key_name, key_prefix in logs_result.all():
        logs.append({
            "id": log.id,
            "endpoint": log.endpoint,
            "model": log.model,
            "input_tokens": log.input_tokens,
            "output_tokens": log.output_tokens,
            "latency_ms": log.latency_ms,
            "status_code": log.status_code,
            "created_at": log.created_at.isoformat(),
            "key_name": key_name,
            "key_prefix": key_prefix,
        })

    plan = getattr(current_user, "plan", "free") or "free"
    limits = PLAN_LIMITS.get(plan, PLAN_LIMITS["free"])
    user = await db.get(User, current_user.id)

    return {
        "plan": plan,
        "requests_today": total_req_today,
        "requests_month": total_req_month,
        "tokens_month": total_tokens,
        "credits_balance": getattr(user, "credits_balance", 0) or 0,
        "limits": limits,
        "recent_logs": logs,
    }


@router.delete("/{key_id}", status_code=204)
async def revoke_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(APIKey).where(APIKey.id == key_id, APIKey.user_id == current_user.id)
    )
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    key.is_active = False
    await db.commit()
