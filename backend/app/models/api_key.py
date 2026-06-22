import secrets
import hashlib
from datetime import datetime, timezone
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Boolean, DateTime, ForeignKey
from app.database import Base


PLAN_LIMITS = {
    "free":       {"req_day": 100,    "req_month": 1_000,   "tokens_month": 100_000,   "rpm": 10},
    "pro":        {"req_day": 1_000,  "req_month": 30_000,  "tokens_month": 5_000_000, "rpm": 60},
    "enterprise": {"req_day": 10_000, "req_month": 300_000, "tokens_month": 50_000_000,"rpm": 600},
}


def generate_api_key() -> tuple[str, str, str]:
    """Returns (full_key, prefix, sha256_hash)"""
    raw = secrets.token_urlsafe(36)
    full = f"sk-rph-{raw}"
    prefix = full[:14]          # e.g. "sk-rph-xxxxxxx"
    hashed = hashlib.sha256(full.encode()).hexdigest()
    return full, prefix, hashed


def hash_key(full_key: str) -> str:
    return hashlib.sha256(full_key.encode()).hexdigest()


class APIKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    key_prefix: Mapped[str] = mapped_column(String(20))
    key_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    plan: Mapped[str] = mapped_column(String(20), default="free")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    requests_today: Mapped[int] = mapped_column(Integer, default=0)
    requests_month: Mapped[int] = mapped_column(Integer, default=0)
    tokens_month: Mapped[int] = mapped_column(Integer, default=0)

    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    day_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    month_reset_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    usage_logs: Mapped[list["UsageLog"]] = relationship("UsageLog", back_populates="api_key", cascade="all, delete")
