from pydantic import BaseModel
from datetime import datetime


class PromptCreate(BaseModel):
    command: str
    title: str
    content: str
    is_public: bool = False


class PromptUpdate(BaseModel):
    command: str | None = None
    title: str | None = None
    content: str | None = None
    is_public: bool | None = None


class PromptOut(BaseModel):
    id: int
    user_id: int | None
    command: str
    title: str
    content: str
    is_public: bool
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}
