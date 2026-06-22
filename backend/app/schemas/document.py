from pydantic import BaseModel
from datetime import datetime


class DocumentOut(BaseModel):
    id: int
    filename: str
    size: int
    mime_type: str
    created_at: datetime

    model_config = {"from_attributes": True}
