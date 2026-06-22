from beanie import Document
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timezone
from typing import Optional


def utcnow():
    return datetime.now(timezone.utc)


class LoginEvent(BaseModel):
    timestamp: datetime = Field(default_factory=utcnow)
    ip: str = ""
    user_agent: str = ""
    success: bool = True


class ApiKey(BaseModel):
    key_id: str
    name: str
    key_prefix: str          # first 8 chars for display
    key_hash: str            # SHA-256 of full key
    created_at: datetime = Field(default_factory=utcnow)
    last_used: Optional[datetime] = None
    usage_count: int = 0
    is_active: bool = True


class Subscription(BaseModel):
    plan: str = "free"       # free | pro | enterprise
    status: str = "active"   # active | expired | cancelled
    started_at: datetime = Field(default_factory=utcnow)
    expires_at: Optional[datetime] = None


class UsageStats(BaseModel):
    messages_sent: int = 0
    tokens_used: int = 0
    last_active: Optional[datetime] = None


class UserProfile(Document):
    """Extended user profile stored in MongoDB. Links to SQLite user via email."""
    email: EmailStr
    username: str
    sqlite_user_id: int          # FK to SQLite users.id
    login_history: list[LoginEvent] = []
    api_keys: list[ApiKey] = []
    subscription: Subscription = Field(default_factory=Subscription)
    usage_stats: UsageStats = Field(default_factory=UsageStats)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    class Settings:
        name = "user_profiles"
        indexes = [
            [("email", 1)],
            [("sqlite_user_id", 1)],
        ]
