from sqlalchemy import String, Boolean, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="user")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    # Email verification (added via migration — existing rows default True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    verification_token: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    verification_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    # Password reset
    reset_token: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None)
    reset_expires: Mapped[datetime | None] = mapped_column(DateTime, nullable=True, default=None)
    # Google OAuth
    google_id: Mapped[str | None] = mapped_column(String(128), nullable=True, default=None, index=True)
    profile_picture: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)
    # API Platform plan
    plan: Mapped[str] = mapped_column(String(20), default="free", server_default="free")

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    chats: Mapped[list["Chat"]] = relationship("Chat", back_populates="user", cascade="all, delete")
    bots: Mapped[list["GPTBot"]] = relationship("GPTBot", back_populates="author")
    documents: Mapped[list["Document"]] = relationship("Document", back_populates="user", cascade="all, delete")
