import json
import uuid
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse, PlainTextResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone
from app.database import get_db, AsyncSessionLocal
from app.models.user import User
from app.models.chat import Chat, Message
from app.models.bot import GPTBot
from app.models.document import Document
from app.models.memory import Memory
from app.schemas.chat import ChatCreate, ChatUpdate, ChatOut, ChatDetail, MessageOut, SendMessage
from app.services.auth import get_current_user
from app.services.llm import stream_chat
from app.services.vector_memory import retrieve_context, store_exchange
import httpx

router = APIRouter(prefix="/api/chats", tags=["chats"])

DDGS_HEADERS = {"User-Agent": "Rahnuma/1.0"}


async def _ddg_search(query: str, max_results: int = 4) -> list[dict]:
    results = []
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            r = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": "1", "skip_disambig": "1"},
                headers=DDGS_HEADERS,
            )
            if r.status_code == 200:
                d = r.json()
                if d.get("AbstractText"):
                    results.append({"title": d.get("Heading", query), "body": d["AbstractText"]})
                if d.get("Answer") and not results:
                    results.append({"title": query, "body": d["Answer"]})
                for t in d.get("RelatedTopics", []):
                    if len(results) >= max_results:
                        break
                    if isinstance(t, dict) and t.get("Text"):
                        results.append({"title": t["Text"][:60], "body": t["Text"]})
    except Exception:
        pass
    return results[:max_results]


@router.get("", response_model=list[ChatOut])
async def list_chats(
    archived: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Chat)
        .where(Chat.user_id == current_user.id, Chat.is_archived == archived)
        .order_by(Chat.is_pinned.desc(), Chat.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ChatOut, status_code=201)
async def create_chat(
    data: ChatCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    chat = Chat(title=data.title, user_id=current_user.id, bot_id=data.bot_id)
    db.add(chat)
    await db.commit()
    await db.refresh(chat)
    return chat


@router.get("/{chat_id}", response_model=ChatDetail)
async def get_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    msgs = await db.execute(select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at))
    msgs_list = [MessageOut.model_validate(m) for m in msgs.scalars().all()]
    # Build ChatDetail from ChatOut to avoid triggering lazy-load on the messages relationship
    chat_out = ChatOut.model_validate(chat)
    return ChatDetail(**chat_out.model_dump(), messages=msgs_list)


@router.get("/{chat_id}/export")
async def export_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Download a chat as a Markdown file."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    msgs = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    )

    lines = [f"# {chat.title}", f"*Exported from Rahnuma — Riphah International University*", ""]
    for m in msgs.scalars().all():
        role_label = "**You**" if m.role == "user" else "**Rahnuma**"
        lines.append(f"### {role_label}")
        lines.append(m.content)
        lines.append("")

    md = "\n".join(lines)
    safe_title = "".join(c if c.isalnum() or c in " -_" else "_" for c in chat.title)[:50]
    return PlainTextResponse(
        content=md,
        headers={"Content-Disposition": f'attachment; filename="{safe_title}.md"'},
        media_type="text/markdown",
    )


@router.patch("/{chat_id}", response_model=ChatOut)
async def update_chat(
    chat_id: int,
    data: ChatUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    if data.title is not None:
        chat.title = data.title
    if data.is_pinned is not None:
        chat.is_pinned = data.is_pinned
    if data.is_archived is not None:
        chat.is_archived = data.is_archived
    if data.folder is not None:
        chat.folder = data.folder or None   # empty string → None (unfolder)

    await db.commit()
    await db.refresh(chat)
    return chat


@router.delete("/{chat_id}", status_code=204)
async def delete_chat(
    chat_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    await db.delete(chat)
    await db.commit()


@router.delete("/{chat_id}/messages/from/{message_id}", status_code=204)
async def truncate_messages(
    chat_id: int,
    message_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete a message and all messages that come after it in the same chat."""
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    target = await db.execute(select(Message).where(Message.id == message_id, Message.chat_id == chat_id))
    msg = target.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    to_delete = await db.execute(
        select(Message).where(Message.chat_id == chat_id, Message.created_at >= msg.created_at)
    )
    for m in to_delete.scalars().all():
        await db.delete(m)
    await db.commit()


@router.post("/{chat_id}/messages")
async def send_message(
    chat_id: int,
    data: SendMessage,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Chat).where(Chat.id == chat_id, Chat.user_id == current_user.id))
    chat = result.scalar_one_or_none()
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    # ── Bot system prompt ──
    bot_prompt: str | None = None
    if chat.bot_id:
        br = await db.execute(select(GPTBot).where(GPTBot.id == chat.bot_id))
        bot = br.scalar_one_or_none()
        if bot and bot.instructions.strip():
            knowledge = json.loads(bot.knowledge or "[]")
            knowledge_text = "\n\n".join(
                f"--- {k['name']} ---\n{k['text']}" for k in knowledge if k.get("text")
            )
            bot_prompt = bot.instructions
            if knowledge_text:
                bot_prompt += f"\n\n## Knowledge\n{knowledge_text}"

    # ── Document context ──
    doc_context: str | None = None
    if data.document_id:
        doc_r = await db.execute(
            select(Document).where(Document.id == data.document_id, Document.user_id == current_user.id)
        )
        doc = doc_r.scalar_one_or_none()
        if doc:
            preview = doc.content[:12000]
            doc_context = f'\n\n## Attached Document: "{doc.filename}"\n\n{preview}'
            if len(doc.content) > 12000:
                doc_context += "\n\n[... document truncated ...]"

    # ── User memories ──
    mem_result = await db.execute(
        select(Memory).where(Memory.user_id == current_user.id).order_by(Memory.created_at)
    )
    memories = mem_result.scalars().all()
    memory_context: str | None = None
    if memories:
        items = "\n".join(f"- {m.content}" for m in memories)
        memory_context = f"\n\n## About This User\n{items}"

    # ── Web search ──
    search_context: str | None = None
    if data.web_search:
        search_results = await _ddg_search(data.content)
        if search_results:
            snippets = "\n\n".join(f"**{r['title']}**\n{r['body']}" for r in search_results)
            search_context = f"\n\n## Web Search Results for: \"{data.content}\"\n{snippets}\n\nAnswer using the search results above. Cite what you used."

    # ── Vector memory context ──
    vector_ctx = retrieve_context(current_user.id, data.content, n=3)

    # ── Commit user message ──
    user_msg = Message(chat_id=chat_id, role="user", content=data.content)
    db.add(user_msg)

    if chat.title == "New Chat":
        chat.title = data.content[:50] + ("..." if len(data.content) > 50 else "")

    await db.commit()

    # ── Build history ──
    msgs_result = await db.execute(
        select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
    )
    history = [{"role": m.role, "content": m.content} for m in msgs_result.scalars().all()]

    # ── Merge all context ──
    parts = [bot_prompt or "", doc_context or "", memory_context or "", search_context or "", vector_ctx]
    final_system = "".join(parts).strip() or None

    user_id = current_user.id
    question = data.content

    async def generate():
        collected = []
        try:
            async for token in stream_chat(history, system_prompt=final_system):
                collected.append(token)
                # JSON-encode so embedded \n characters survive SSE line-splitting
                yield f"data: {json.dumps(token)}\n\n"
        finally:
            full_response = "".join(collected)
            if full_response:
                async with AsyncSessionLocal() as save_db:
                    save_db.add(Message(chat_id=chat_id, role="assistant", content=full_response))
                    chat_row = await save_db.get(Chat, chat_id)
                    if chat_row:
                        chat_row.updated_at = datetime.now(timezone.utc)
                    await save_db.commit()
                    # Store exchange in vector memory (non-blocking, best-effort)
                    try:
                        exchange_id = f"{chat_id}-{user_msg.id}"
                        store_exchange(user_id, exchange_id, question, full_response)
                    except Exception:
                        pass
                    # Sync full conversation to MongoDB (non-blocking, best-effort)
                    try:
                        from app.db.mongodb import is_connected
                        from app.models.mongo_chat import sync_chat_to_mongo
                        if is_connected():
                            all_msgs = await save_db.execute(
                                select(Message).where(Message.chat_id == chat_id).order_by(Message.created_at)
                            )
                            await sync_chat_to_mongo(
                                chat_id=chat_id,
                                user_id=user_id,
                                username=current_user.username,
                                title=chat_row.title if chat_row else "Chat",
                                messages=all_msgs.scalars().all(),
                            )
                    except Exception:
                        pass
        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
