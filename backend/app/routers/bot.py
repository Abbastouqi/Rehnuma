import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.bot import GPTBot
from app.models.user import User
from app.schemas.bot import BotCreate, BotUpdate, BotOut, BotDetail, PreviewRequest
from app.services.auth import get_current_user
from app.services.llm import stream_chat

router = APIRouter(prefix="/api/bots", tags=["bots"])


def _to_out(bot: GPTBot, author_name: str | None = None) -> dict:
    return {
        "id": bot.id,
        "name": bot.name,
        "description": bot.description,
        "starters": json.loads(bot.starters or "[]"),
        "category": bot.category,
        "icon": bot.icon,
        "is_public": bot.is_public,
        "author_id": bot.author_id,
        "author_name": author_name,
        "created_at": bot.created_at,
    }


def _to_detail(bot: GPTBot, author_name: str | None = None) -> dict:
    d = _to_out(bot, author_name)
    d.update(
        instructions=bot.instructions,
        knowledge=json.loads(bot.knowledge or "[]"),
        capabilities=json.loads(
            bot.capabilities or '{"webSearch":false,"imageGen":false,"codeInterpreter":false}'
        ),
        model=bot.model,
    )
    return d


@router.get("", response_model=list[BotOut])
async def list_bots(db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(GPTBot).where(GPTBot.is_public == True).order_by(GPTBot.created_at.desc())
    )
    bots = result.scalars().all()
    out = []
    for bot in bots:
        author_name = None
        if bot.author_id:
            ur = await db.execute(select(User).where(User.id == bot.author_id))
            u = ur.scalar_one_or_none()
            if u:
                author_name = u.username
        out.append(_to_out(bot, author_name))
    return out


@router.get("/my", response_model=list[BotOut])
async def my_bots(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GPTBot).where(GPTBot.author_id == current_user.id).order_by(GPTBot.created_at.desc())
    )
    bots = result.scalars().all()
    return [_to_out(bot, current_user.username) for bot in bots]


@router.get("/{bot_id}", response_model=BotDetail)
async def get_bot(bot_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(GPTBot).where(GPTBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    author_name = None
    if bot.author_id:
        ur = await db.execute(select(User).where(User.id == bot.author_id))
        u = ur.scalar_one_or_none()
        if u:
            author_name = u.username
    return _to_detail(bot, author_name)


@router.post("", response_model=BotDetail, status_code=201)
async def create_bot(
    data: BotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    bot = GPTBot(
        name=data.name,
        description=data.description,
        instructions=data.instructions,
        starters=json.dumps(data.starters),
        knowledge=json.dumps([k.model_dump() for k in data.knowledge]),
        capabilities=json.dumps(data.capabilities.model_dump()),
        model=data.model,
        category=data.category,
        icon=data.icon,
        is_public=data.is_public,
        author_id=current_user.id,
    )
    db.add(bot)
    await db.commit()
    await db.refresh(bot)
    return _to_detail(bot, current_user.username)


@router.put("/{bot_id}", response_model=BotDetail)
async def update_bot(
    bot_id: int,
    data: BotUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GPTBot).where(GPTBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if bot.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your bot")
    bot.name = data.name
    bot.description = data.description
    bot.instructions = data.instructions
    bot.starters = json.dumps(data.starters)
    bot.knowledge = json.dumps([k.model_dump() for k in data.knowledge])
    bot.capabilities = json.dumps(data.capabilities.model_dump())
    bot.model = data.model
    bot.category = data.category
    bot.icon = data.icon
    bot.is_public = data.is_public
    await db.commit()
    await db.refresh(bot)
    return _to_detail(bot, current_user.username)


@router.delete("/{bot_id}", status_code=204)
async def delete_bot(
    bot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(GPTBot).where(GPTBot.id == bot_id))
    bot = result.scalar_one_or_none()
    if not bot:
        raise HTTPException(status_code=404, detail="Bot not found")
    if bot.author_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your bot")
    await db.delete(bot)
    await db.commit()


@router.post("/preview/chat")
async def preview_chat(
    data: PreviewRequest,
    current_user: User = Depends(get_current_user),
):
    messages = [*data.history, {"role": "user", "content": data.message}]

    async def generate():
        async for token in stream_chat(messages, system_prompt=data.instructions or None):
            yield f"data: {token}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
