from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel
from app.database import get_db
from app.models.user import User
from app.models.chat import Chat, Message
from app.models.document import Document
from app.services.auth import require_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


class UserUpdate(BaseModel):
    role: str | None = None
    is_active: bool | None = None


@router.get("/stats")
async def get_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    users = (await db.execute(select(func.count()).select_from(User))).scalar()
    chats = (await db.execute(select(func.count()).select_from(Chat))).scalar()
    messages = (await db.execute(select(func.count()).select_from(Message))).scalar()
    documents = (await db.execute(select(func.count()).select_from(Document))).scalar()
    return {
        "users": users,
        "chats": chats,
        "messages": messages,
        "documents": documents,
    }


@router.get("/users")
async def list_users(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()))
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat(),
        }
        for u in result.scalars().all()
    ]


@router.put("/users/{user_id}")
async def update_user(
    user_id: int,
    data: UserUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot modify your own account here")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.role is not None:
        if data.role not in ("user", "admin"):
            raise HTTPException(status_code=400, detail="Role must be 'user' or 'admin'")
        user.role = data.role
    if data.is_active is not None:
        user.is_active = data.is_active
    await db.commit()
    return {"id": user.id, "username": user.username, "role": user.role, "is_active": user.is_active}


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    await db.delete(user)
    await db.commit()


@router.get("/chats")
async def list_all_chats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    rows = (await db.execute(
        select(Chat, User.username)
        .join(User, Chat.user_id == User.id)
        .order_by(Chat.updated_at.desc())
        .limit(200)
    )).all()
    return [
        {
            "id": c.id,
            "title": c.title,
            "username": username,
            "updated_at": c.updated_at.isoformat(),
        }
        for c, username in rows
    ]


@router.get("/api-keys")
async def list_all_api_keys(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import APIKey
    rows = (await db.execute(
        select(APIKey, User.username, User.email)
        .join(User, APIKey.user_id == User.id)
        .order_by(APIKey.created_at.desc())
        .limit(500)
    )).all()
    return [
        {
            "id": k.id,
            "name": k.name,
            "key_prefix": k.key_prefix,
            "plan": k.plan,
            "is_active": k.is_active,
            "requests_today": k.requests_today,
            "requests_month": k.requests_month,
            "tokens_month": k.tokens_month,
            "last_used_at": k.last_used_at.isoformat() if k.last_used_at else None,
            "created_at": k.created_at.isoformat(),
            "username": username,
            "email": email,
        }
        for k, username, email in rows
    ]


@router.put("/api-keys/{key_id}")
async def update_api_key(
    key_id: int,
    data: dict = Body(...),
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import APIKey
    result = await db.execute(select(APIKey).where(APIKey.id == key_id))
    key = result.scalar_one_or_none()
    if not key:
        raise HTTPException(status_code=404, detail="API key not found")
    if "is_active" in data:
        key.is_active = data["is_active"]
    if "plan" in data and data["plan"] in ("free", "pro", "enterprise"):
        key.plan = data["plan"]
    await db.commit()
    return {"id": key.id, "is_active": key.is_active, "plan": key.plan}


@router.get("/usage-logs")
async def list_usage_logs(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import APIKey
    from app.models.usage_log import UsageLog
    rows = (await db.execute(
        select(UsageLog, APIKey.name, APIKey.key_prefix, User.username)
        .join(APIKey, UsageLog.api_key_id == APIKey.id, isouter=True)
        .join(User, UsageLog.user_id == User.id, isouter=True)
        .order_by(UsageLog.created_at.desc())
        .limit(100)
    )).all()
    return [
        {
            "id": log.id,
            "endpoint": log.endpoint,
            "model": log.model,
            "input_tokens": log.input_tokens,
            "output_tokens": log.output_tokens,
            "latency_ms": log.latency_ms,
            "status_code": log.status_code,
            "created_at": log.created_at.isoformat(),
            "key_name": kname,
            "key_prefix": kprefix,
            "username": uname,
        }
        for log, kname, kprefix, uname in rows
    ]


@router.get("/api-stats")
async def get_api_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.api_key import APIKey
    from app.models.usage_log import UsageLog
    from sqlalchemy import func
    total_keys = (await db.execute(select(func.count()).select_from(APIKey))).scalar()
    active_keys = (await db.execute(select(func.count()).select_from(APIKey).where(APIKey.is_active == True))).scalar()
    total_requests = (await db.execute(select(func.sum(APIKey.requests_month)).select_from(APIKey))).scalar() or 0
    total_tokens = (await db.execute(select(func.sum(APIKey.tokens_month)).select_from(APIKey))).scalar() or 0
    return {
        "total_keys": total_keys,
        "active_keys": active_keys,
        "total_requests_month": total_requests,
        "total_tokens_month": total_tokens,
    }
