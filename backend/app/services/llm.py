import json
import re
import httpx
from app.config import settings
from app.services.prompt import SYSTEM_PROMPT

HEADERS = {
    "Origin": settings.MODEL_URL,
    "Referer": f"{settings.MODEL_URL}/",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "text/event-stream",
}

def _strip_think_tags(text: str) -> str:
    """Remove <think>...</think> reasoning blocks that Qwen3 may emit."""
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).lstrip("\n").strip()

async def stream_chat(messages: list[dict], system_prompt: str | None = None):
    payload = {
        "model": settings.MODEL_NAME,
        "messages": [
            {"role": "system", "content": system_prompt or SYSTEM_PROMPT},
            *messages,
        ],
        "max_tokens": settings.MAX_TOKENS,
        "stream": True,
        "thinking": {"type": "disabled"},
    }

    full_content = ""
    full_reasoning = ""
    buffer = ""          # accumulates tokens until <think> block is resolved
    in_think = False     # True while inside a <think> block

    async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
        async with client.stream(
            "POST",
            f"{settings.MODEL_URL}/v1/chat/completions",
            json=payload,
            headers=HEADERS,
        ) as r:
            if r.status_code != 200:
                body = await r.aread()
                raise Exception(f"Model error {r.status_code}: {body.decode()}")

            async for line in r.aiter_lines():
                if not line.startswith("data: "):
                    continue
                data = line[6:].strip()
                if data == "[DONE]":
                    break
                try:
                    chunk = json.loads(data)
                    delta = chunk["choices"][0]["delta"]

                    # Some servers return thinking in reasoning_content field
                    if delta.get("reasoning_content"):
                        full_reasoning += delta["reasoning_content"]
                        continue

                    token = delta.get("content", "")
                    if not token:
                        continue

                    buffer += token

                    # Detect start of <think> block
                    if "<think>" in buffer and not in_think:
                        in_think = True
                        # Yield anything before <think>
                        before = buffer.split("<think>")[0]
                        if before.strip():
                            full_content += before
                            yield before
                        buffer = ""
                        continue

                    # Detect end of </think> block
                    if in_think:
                        if "</think>" in buffer:
                            in_think = False
                            after = buffer.split("</think>", 1)[1].lstrip("\n")
                            buffer = after
                            if after.strip():
                                full_content += after
                                yield after
                        # Still inside think block — discard
                        continue

                    # Normal content — flush buffer
                    full_content += buffer
                    yield buffer
                    buffer = ""

                except (json.JSONDecodeError, KeyError, IndexError):
                    pass

            # Flush any remaining buffer
            if buffer and not in_think:
                full_content += buffer
                yield buffer

    # Fallback: if model put everything in reasoning and content was empty
    if not full_content and full_reasoning:
        answer = _extract_answer(full_reasoning)
        yield answer

def _extract_answer(reasoning: str) -> str:
    clean = _strip_think_tags(reasoning)
    paragraphs = [p.strip() for p in clean.split("\n\n") if p.strip()]
    for para in reversed(paragraphs):
        lines = [l.strip() for l in para.splitlines() if l.strip()]
        clean_lines = [l for l in lines if not l.startswith("*") and not l.startswith("-")]
        if clean_lines:
            return " ".join(clean_lines)
    return clean
