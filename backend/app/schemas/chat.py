from pydantic import BaseModel
from datetime import datetime


class ChatCreate(BaseModel):
    title: str = "New Chat"
    bot_id: int | None = None


class ChatUpdate(BaseModel):
    title: str | None = None
    is_pinned: bool | None = None
    is_archived: bool | None = None
    folder: str | None = None


class ChatRename(BaseModel):
    title: str


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ChatOut(BaseModel):
    id: int
    title: str
    bot_id: int | None
    is_pinned: bool
    is_archived: bool
    folder: str | None
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


class ChatDetail(ChatOut):
    messages: list[MessageOut] = []


class SendMessage(BaseModel):
    content: str
    document_id: int | None = None
    web_search: bool = False
