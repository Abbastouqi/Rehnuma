from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_
from datetime import datetime, timezone
from app.database import get_db
from app.models.user import User
from app.models.prompt import Prompt
from app.schemas.prompt import PromptCreate, PromptUpdate, PromptOut
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/prompts", tags=["prompts"])


@router.get("", response_model=list[PromptOut])
async def list_prompts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return own prompts + all public prompts (including built-ins)."""
    result = await db.execute(
        select(Prompt).where(
            or_(
                Prompt.user_id == current_user.id,
                Prompt.is_public == True,
            )
        ).order_by(Prompt.command)
    )
    return result.scalars().all()


@router.post("", response_model=PromptOut, status_code=201)
async def create_prompt(
    data: PromptCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Command must be unique per user
    existing = await db.execute(
        select(Prompt).where(Prompt.user_id == current_user.id, Prompt.command == data.command.lower().strip())
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail=f"Command /{data.command} already exists")

    prompt = Prompt(
        user_id=current_user.id,
        command=data.command.lower().strip().lstrip("/"),
        title=data.title,
        content=data.content,
        is_public=data.is_public,
    )
    db.add(prompt)
    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.put("/{prompt_id}", response_model=PromptOut)
async def update_prompt(
    prompt_id: int,
    data: PromptUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == current_user.id)
    )
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")

    if data.command is not None:
        prompt.command = data.command.lower().strip().lstrip("/")
    if data.title is not None:
        prompt.title = data.title
    if data.content is not None:
        prompt.content = data.content
    if data.is_public is not None:
        prompt.is_public = data.is_public
    prompt.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(prompt)
    return prompt


@router.delete("/{prompt_id}", status_code=204)
async def delete_prompt(
    prompt_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Prompt).where(Prompt.id == prompt_id, Prompt.user_id == current_user.id)
    )
    prompt = result.scalar_one_or_none()
    if not prompt:
        raise HTTPException(status_code=404, detail="Prompt not found")
    await db.delete(prompt)
    await db.commit()
