from sqlalchemy import String, ForeignKey, DateTime, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from datetime import datetime, timezone
from app.database import Base


class GPTBot(Base):
    __tablename__ = "bots"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(String(500), default="")
    instructions: Mapped[str] = mapped_column(Text, default="")
    starters: Mapped[str] = mapped_column(Text, default="[]")          # JSON array[str]
    knowledge: Mapped[str] = mapped_column(Text, default="[]")          # JSON array[{name,text}]
    capabilities: Mapped[str] = mapped_column(
        Text,
        default='{"webSearch":false,"imageGen":false,"codeInterpreter":false}',
    )
    model: Mapped[str] = mapped_column(String(100), default="")
    category: Mapped[str] = mapped_column(String(50), default="General")
    icon: Mapped[str] = mapped_column(Text, default="🤖")
    is_public: Mapped[bool] = mapped_column(Boolean, default=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc)
    )

    author: Mapped["User | None"] = relationship("User", back_populates="bots")
    chats: Mapped[list["Chat"]] = relationship("Chat", back_populates="bot")
