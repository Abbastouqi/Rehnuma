import json
import httpx
from fastapi import FastAPI, Form, HTTPException
from pydantic import BaseModel

MODEL_URL  = "https://mist.riphah.edu.pk"
MODEL_NAME = "ggml-org/gemma-4-12B-it-GGUF:Q4_K_M"
MAX_TOKENS = 500
PORT       = 8001


def _extract_answer(reasoning: str) -> str:
    """Pull the last clean paragraph from the reasoning as the final answer."""
    paragraphs = [p.strip() for p in reasoning.split("\n\n") if p.strip()]
    for para in reversed(paragraphs):
        lines = [l.strip() for l in para.splitlines() if l.strip()]
        clean = [l for l in lines if not l.startswith("*") and not l.startswith("-")]
        if clean:
            return " ".join(clean)
    return reasoning.strip()


app = FastAPI(title="Gemma Chat API")


class ChatResponse(BaseModel):
    response: str


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
async def chat(prompt: str = Form(...)):
    if not prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt is empty.")

    payload = {
        "model": MODEL_NAME,
        "messages": [
            {"role": "system", "content": "Answer directly and concisely in 1-2 sentences."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": MAX_TOKENS,
        "stream": True,
        "thinking": {"type": "disabled"},
    }
    headers = {
        "Origin": MODEL_URL,
        "Referer": f"{MODEL_URL}/",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
        "Accept": "text/event-stream",
    }

    try:
        full_content = ""
        async with httpx.AsyncClient(timeout=120, follow_redirects=True) as client:
            async with client.stream(
                "POST",
                f"{MODEL_URL}/v1/chat/completions",
                json=payload,
                headers=headers,
            ) as r:
                if r.status_code != 200:
                    error_body = await r.aread()
                    raise HTTPException(status_code=r.status_code, detail=error_body.decode())

                full_reasoning = ""
                async for line in r.aiter_lines():
                    if not line.startswith("data: "):
                        continue
                    data = line[6:].strip()
                    if data == "[DONE]":
                        break
                    try:
                        chunk = json.loads(data)
                        delta = chunk["choices"][0]["delta"]
                        if delta.get("content"):
                            full_content += delta["content"]
                        elif delta.get("reasoning_content"):
                            full_reasoning += delta["reasoning_content"]
                    except (json.JSONDecodeError, KeyError, IndexError):
                        pass
                if not full_content:
                    full_content = _extract_answer(full_reasoning)

    except httpx.RequestError as e:
        raise HTTPException(status_code=502, detail=f"Could not reach model: {e}")

    return ChatResponse(response=full_content.strip())


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=PORT)
