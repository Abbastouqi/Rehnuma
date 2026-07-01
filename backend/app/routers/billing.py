"""
Billing & Credits API
  GET  /api/billing/packages          — list available credit packages
  POST /api/billing/purchase          — purchase a credit package (simulated payment)
  GET  /api/billing/history           — user's transaction history
  GET  /api/billing/invoice/{id}      — invoice details for a transaction
  GET  /api/billing/balance           — current credits balance
"""
import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel, Field
from app.database import get_db
from app.models.user import User
from app.models.payment import CreditPackage, Transaction
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])


class PurchaseRequest(BaseModel):
    package_id: int
    # In a real integration these would go to Stripe; here we simulate instantly
    card_last4: str = Field(default="4242", max_length=4)
    card_brand: str = Field(default="Visa", max_length=20)


# ── Public ──────────────────────────────────────────────────────────────────

@router.get("/packages")
async def list_packages(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(CreditPackage)
        .where(CreditPackage.is_active == True)
        .order_by(CreditPackage.sort_order, CreditPackage.id)
    )
    pkgs = result.scalars().all()
    return [
        {
            "id": p.id,
            "name": p.name,
            "description": p.description,
            "credits": p.credits,
            "price_usd": p.price_usd,
            "is_featured": p.is_featured,
            "price_per_1m": round((p.price_usd / p.credits) * 1_000_000, 2) if p.credits > 0 else 0,
        }
        for p in pkgs
    ]


# ── Authenticated ────────────────────────────────────────────────────────────

@router.get("/balance")
async def get_balance(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    user = await db.get(User, current_user.id)
    return {
        "credits_balance": user.credits_balance,
        "total_credits_purchased": user.total_credits_purchased,
        "plan": user.plan,
    }


@router.post("/purchase", status_code=201)
async def purchase_credits(
    data: PurchaseRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    pkg = await db.get(CreditPackage, data.package_id)
    if not pkg or not pkg.is_active:
        raise HTTPException(status_code=404, detail="Package not found or unavailable")

    # Simulated payment — in production replace with Stripe PaymentIntent
    reference = f"sim_{secrets.token_hex(8)}"

    user = await db.get(User, current_user.id)

    txn = Transaction(
        user_id=current_user.id,
        package_id=pkg.id,
        credits=pkg.credits,
        amount_usd=pkg.price_usd,
        status="completed",
        payment_method=f"{data.card_brand} •••• {data.card_last4}",
        reference=reference,
        notes=f"Purchase: {pkg.name}",
    )
    db.add(txn)

    # Add credits immediately (simulated instant payment confirmation)
    user.credits_balance = (user.credits_balance or 0) + pkg.credits
    user.total_credits_purchased = (user.total_credits_purchased or 0) + pkg.credits

    await db.commit()
    await db.refresh(txn)
    await db.refresh(user)

    return {
        "transaction_id": txn.id,
        "status": "completed",
        "credits_added": pkg.credits,
        "new_balance": user.credits_balance,
        "amount_usd": pkg.price_usd,
        "reference": reference,
        "message": f"Successfully purchased {pkg.credits:,} credits.",
    }


@router.get("/history")
async def billing_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction, CreditPackage.name)
        .join(CreditPackage, Transaction.package_id == CreditPackage.id, isouter=True)
        .where(Transaction.user_id == current_user.id)
        .order_by(Transaction.created_at.desc())
        .limit(100)
    )
    rows = result.all()
    return [
        {
            "id": t.id,
            "package_name": pkg_name,
            "credits": t.credits,
            "amount_usd": t.amount_usd,
            "status": t.status,
            "payment_method": t.payment_method,
            "reference": t.reference,
            "notes": t.notes,
            "created_at": t.created_at.isoformat(),
        }
        for t, pkg_name in rows
    ]


@router.get("/invoice/{transaction_id}")
async def get_invoice(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Transaction, CreditPackage.name, CreditPackage.description)
        .join(CreditPackage, Transaction.package_id == CreditPackage.id, isouter=True)
        .where(Transaction.id == transaction_id, Transaction.user_id == current_user.id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Transaction not found")
    t, pkg_name, pkg_desc = row
    return {
        "invoice_number": f"INV-{t.id:06d}",
        "date": t.created_at.isoformat(),
        "customer": {"username": current_user.username, "email": current_user.email},
        "item": {
            "description": pkg_name or "Credits",
            "detail": pkg_desc or "",
            "credits": t.credits,
            "amount_usd": t.amount_usd,
        },
        "payment_method": t.payment_method,
        "reference": t.reference,
        "status": t.status,
        "total_usd": t.amount_usd,
    }
