import json
from pydantic import BaseModel, field_validator
from datetime import datetime
from typing import Optional


class BotCapabilities(BaseModel):
    webSearch: bool = False
    imageGen: bool = False
    codeInterpreter: bool = False


class KnowledgeFile(BaseModel):
    name: str
    text: str


class BotCreate(BaseModel):
    name: str
    description: str = ""
    instructions: str = ""
    starters: list[str] = []
    knowledge: list[KnowledgeFile] = []
    capabilities: BotCapabilities = BotCapabilities()
    model: str = ""
    category: str = "General"
    icon: str = "🤖"
    is_public: bool = True


class BotUpdate(BotCreate):
    pass


class BotOut(BaseModel):
    id: int
    name: str
    description: str
    starters: list[str]
    category: str
    icon: str
    is_public: bool
    author_id: int | None
    author_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("starters", mode="before")
    @classmethod
    def parse_starters(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []


class BotDetail(BotOut):
    instructions: str
    knowledge: list[KnowledgeFile]
    capabilities: BotCapabilities
    model: str

    @field_validator("knowledge", mode="before")
    @classmethod
    def parse_knowledge(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return []
        return v or []

    @field_validator("capabilities", mode="before")
    @classmethod
    def parse_capabilities(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except Exception:
                return BotCapabilities()
        return v or BotCapabilities()


class PreviewRequest(BaseModel):
    instructions: str
    message: str
    history: list[dict] = []
