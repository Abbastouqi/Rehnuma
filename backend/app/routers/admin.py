from fastapi import APIRouter, Depends, HTTPException, Body, Query
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


class CreditsAdjust(BaseModel):
    delta: int
    notes: str = ""


class PlanChange(BaseModel):
    plan: str


class PackageCreate(BaseModel):
    name: str
    description: str = ""
    credits: int
    price_usd: float
    is_featured: bool = False
    sort_order: int = 0


class PackageUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    credits: int | None = None
    price_usd: float | None = None
    is_active: bool | None = None
    is_featured: bool | None = None
    sort_order: int | None = None


# ── Overview Stats ────────────────────────────────────────────────────────────

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


# ── User Management ───────────────────────────────────────────────────────────

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
            "plan": u.plan,
            "is_active": u.is_active,
            "credits_balance": getattr(u, "credits_balance", 0) or 0,
            "total_credits_purchased": getattr(u, "total_credits_purchased", 0) or 0,
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


@router.put("/users/{user_id}/credits")
async def adjust_credits(
    user_id: int,
    data: CreditsAdjust,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import Transaction
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    old_balance = getattr(user, "credits_balance", 0) or 0
    new_balance = max(0, old_balance + data.delta)
    user.credits_balance = new_balance

    if data.delta > 0:
        user.total_credits_purchased = (getattr(user, "total_credits_purchased", 0) or 0) + data.delta
        txn = Transaction(
            user_id=user_id,
            package_id=None,
            credits=data.delta,
            amount_usd=0.0,
            status="completed",
            payment_method="admin_grant",
            notes=data.notes or f"Admin credit grant by {admin.username}",
        )
        db.add(txn)

    await db.commit()
    return {
        "user_id": user_id,
        "old_balance": old_balance,
        "new_balance": new_balance,
        "delta": data.delta,
    }


@router.put("/users/{user_id}/plan")
async def change_plan(
    user_id: int,
    data: PlanChange,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    if data.plan not in ("free", "pro", "enterprise"):
        raise HTTPException(status_code=400, detail="Plan must be free, pro, or enterprise")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.plan = data.plan
    # Update all their API keys too
    from app.models.api_key import APIKey
    keys_result = await db.execute(select(APIKey).where(APIKey.user_id == user_id))
    for key in keys_result.scalars().all():
        key.plan = data.plan
    await db.commit()
    return {"user_id": user_id, "plan": data.plan}


# ── Chats ─────────────────────────────────────────────────────────────────────

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


# ── API Keys ──────────────────────────────────────────────────────────────────

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
    limit: int = Query(default=100, le=500),
):
    from app.models.api_key import APIKey
    from app.models.usage_log import UsageLog
    rows = (await db.execute(
        select(UsageLog, APIKey.name, APIKey.key_prefix, User.username)
        .join(APIKey, UsageLog.api_key_id == APIKey.id, isouter=True)
        .join(User, UsageLog.user_id == User.id, isouter=True)
        .order_by(UsageLog.created_at.desc())
        .limit(limit)
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


# ── Billing ───────────────────────────────────────────────────────────────────

@router.get("/billing/stats")
async def billing_stats(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import Transaction, CreditPackage
    total_revenue = (
        await db.execute(
            select(func.sum(Transaction.amount_usd))
            .where(Transaction.status == "completed", Transaction.amount_usd > 0)
        )
    ).scalar() or 0.0
    total_credits_sold = (
        await db.execute(
            select(func.sum(Transaction.credits))
            .where(Transaction.status == "completed", Transaction.payment_method != "admin_grant")
        )
    ).scalar() or 0
    total_txns = (await db.execute(select(func.count()).select_from(Transaction))).scalar()
    total_packages = (await db.execute(select(func.count()).select_from(CreditPackage))).scalar()
    total_user_credits = (
        await db.execute(select(func.sum(User.credits_balance)).select_from(User))
    ).scalar() or 0
    return {
        "total_revenue_usd": round(total_revenue, 2),
        "total_credits_sold": total_credits_sold,
        "total_transactions": total_txns,
        "total_packages": total_packages,
        "total_credits_outstanding": total_user_credits,
    }


@router.get("/billing/transactions")
async def list_transactions(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=100, le=500),
):
    from app.models.payment import Transaction, CreditPackage
    rows = (await db.execute(
        select(Transaction, User.username, User.email, CreditPackage.name)
        .join(User, Transaction.user_id == User.id, isouter=True)
        .join(CreditPackage, Transaction.package_id == CreditPackage.id, isouter=True)
        .order_by(Transaction.created_at.desc())
        .limit(limit)
    )).all()
    return [
        {
            "id": t.id,
            "username": uname,
            "email": uemail,
            "package_name": pkg_name,
            "credits": t.credits,
            "amount_usd": t.amount_usd,
            "status": t.status,
            "payment_method": t.payment_method,
            "reference": t.reference,
            "notes": t.notes,
            "created_at": t.created_at.isoformat(),
        }
        for t, uname, uemail, pkg_name in rows
    ]


@router.post("/billing/transactions/{transaction_id}/refund")
async def refund_transaction(
    transaction_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import Transaction
    txn = await db.get(Transaction, transaction_id)
    if not txn:
        raise HTTPException(status_code=404, detail="Transaction not found")
    if txn.status != "completed":
        raise HTTPException(status_code=400, detail="Only completed transactions can be refunded")
    txn.status = "refunded"
    # Deduct the credits back from the user
    user = await db.get(User, txn.user_id)
    if user:
        user.credits_balance = max(0, (user.credits_balance or 0) - txn.credits)
    from datetime import datetime, timezone
    txn.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return {"transaction_id": transaction_id, "status": "refunded"}


# ── Credit Packages ───────────────────────────────────────────────────────────

@router.get("/billing/packages")
async def list_all_packages(
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import CreditPackage
    result = await db.execute(
        select(CreditPackage).order_by(CreditPackage.sort_order, CreditPackage.id)
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "credits": p.credits,
            "price_usd": p.price_usd,
            "is_active": p.is_active,
            "is_featured": p.is_featured,
            "sort_order": p.sort_order,
            "created_at": p.created_at.isoformat() if p.created_at else None,
        }
        for p in result.scalars().all()
    ]


@router.post("/billing/packages", status_code=201)
async def create_package(
    data: PackageCreate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import CreditPackage
    pkg = CreditPackage(
        name=data.name,
        description=data.description,
        credits=data.credits,
        price_usd=data.price_usd,
        is_featured=data.is_featured,
        sort_order=data.sort_order,
    )
    db.add(pkg)
    await db.commit()
    await db.refresh(pkg)
    return {"id": pkg.id, "name": pkg.name, "credits": pkg.credits, "price_usd": pkg.price_usd}


@router.put("/billing/packages/{package_id}")
async def update_package(
    package_id: int,
    data: PackageUpdate,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import CreditPackage
    pkg = await db.get(CreditPackage, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(pkg, field, value)
    await db.commit()
    return {"id": pkg.id, "name": pkg.name, "is_active": pkg.is_active}


@router.delete("/billing/packages/{package_id}", status_code=204)
async def delete_package(
    package_id: int,
    admin: User = Depends(require_admin),
    db: AsyncSession = Depends(get_db),
):
    from app.models.payment import CreditPackage
    pkg = await db.get(CreditPackage, package_id)
    if not pkg:
        raise HTTPException(status_code=404, detail="Package not found")
    await db.delete(pkg)
    await db.commit()
