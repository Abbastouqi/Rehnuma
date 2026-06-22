"""
MongoDB document for persisting complete chat sessions.
This is a secondary store — SQLite is authoritative for IDs and structure.
MongoDB provides rich querying, full-text search, and easy backup.
"""
from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import Optional


def utcnow():
    return datetime.now(timezone.utc)


class MsgDoc(BaseModel):
    role: str                    # "user" | "assistant"
    content: str
    ts: datetime = Field(default_factory=utcnow)


class ChatHistory(Document):
    """One document per chat session. Upserted after every assistant reply."""
    sqlite_chat_id: int          # authoritative ID from SQLite
    user_id: int                 # SQLite user ID
    username: str
    title: str = "New Chat"
    messages: list[MsgDoc] = []
    message_count: int = 0
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "chat_history"
        indexes = [
            [("user_id", 1), ("updated_at", -1)],   # list chats by user, newest first
            [("sqlite_chat_id", 1)],                  # fast upsert lookup
            [("user_id", 1), ("sqlite_chat_id", 1)], # isolation check
        ]


async def sync_chat_to_mongo(
    chat_id: int,
    user_id: int,
    username: str,
    title: str,
    messages,  # SQLAlchemy Message objects
):
    """Upsert the full chat document into MongoDB."""
    msg_docs = [MsgDoc(role=m.role, content=m.content) for m in messages]
    existing = await ChatHistory.find_one(ChatHistory.sqlite_chat_id == chat_id)
    if existing:
        existing.title = title
        existing.messages = msg_docs
        existing.message_count = len(msg_docs)
        existing.updated_at = datetime.now(timezone.utc)
        await existing.save()
    else:
        await ChatHistory(
            sqlite_chat_id=chat_id,
            user_id=user_id,
            username=username,
            title=title,
            messages=msg_docs,
            message_count=len(msg_docs),
        ).insert()
