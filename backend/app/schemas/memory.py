from pydantic import BaseModel
from datetime import datetime


class MemoryCreate(BaseModel):
    content: str


class MemoryOut(BaseModel):
    id: int
    user_id: int
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}
