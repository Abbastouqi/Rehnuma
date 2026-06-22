# راہنما · Rahnuma

**AI Assistant Platform — Riphah International University**

A full-stack AI chat platform powered by Qwen3, built for Riphah International University. Features a modern chat interface, OpenAI-compatible API, user management, and an admin dashboard.

---

## Features

- **Chat Interface** — Streaming responses, conversation history, file attachments, web search, voice input
- **Authentication** — Email/password, Google OAuth, email verification, password reset
- **API Platform** — OpenAI-compatible `/v1/chat/completions` endpoint with API key management
- **Admin Panel** — User management, API key monitoring, usage logs, system stats
- **Bot Studio** — Create custom AI assistants with instructions and knowledge bases
- **Prompt Library** — Slash-command prompt templates
- **Vector Memory** — Per-user semantic memory via ChromaDB
- **Document Chat** — Upload PDF, DOCX, TXT, CSV and chat with documents

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | FastAPI, SQLAlchemy (async), SQLite |
| Auth | JWT, Google OAuth2 |
| LLM | Qwen3-4B-Instruct (via Riphah model server) |
| Vector DB | ChromaDB |
| Profile DB | MongoDB Atlas |
| Streaming | Server-Sent Events (SSE) |

---

## Project Structure

```
Rehnuma/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app, startup, lifespan
│   │   ├── config.py        # Settings from .env
│   │   ├── database.py      # SQLite engine, migrations
│   │   ├── models/          # SQLAlchemy ORM models
│   │   ├── routers/         # API route handlers
│   │   ├── schemas/         # Pydantic request/response schemas
│   │   ├── services/        # Auth, LLM, email, vector memory
│   │   └── utils/           # Security helpers, text extraction
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── src/
    │   ├── App.jsx
    │   ├── components/      # Chat, Sidebar, Auth, Layout
    │   ├── context/         # ChatContext, AuthContext, BotContext
    │   ├── pages/           # AdminPanel, APIKeys, Settings, etc.
    │   └── services/        # Axios API client
    ├── package.json
    └── vite.config.js
```

---

## Local Setup

### Prerequisites
- Python 3.12+
- Node.js 18+
- `uv` (recommended) or `pip`

### Backend

```bash
cd backend

# Create virtual environment
uv venv .venv --python 3.12
source .venv/bin/activate        # Linux/Mac
# or: .venv\Scripts\activate     # Windows

# Install dependencies
uv pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your values

# Run
export PYTHONPATH=""
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Default Admin Account

Created automatically on first backend startup:

```
Username: admin
Password: admin123
```

> Change this password after first login.

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite+aiosqlite:///./gemma_chat.db

MODEL_URL=https://rahnuma.riphah.edu.pk
MODEL_NAME=unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M

APP_URL=http://localhost:5173

GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:8000/api/auth/google/callback

MONGODB_URL=mongodb+srv://...
SMTP_HOST=smtp.gmail.com
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
```

---

## API Platform

The platform exposes an OpenAI-compatible REST API. Any project that works with OpenAI can switch to Rahnuma by changing the base URL and key.

**Base URL:** `https://rahnuma.riphah.edu.pk/api/v1`

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/v1/chat/completions` | Chat with the model |
| `GET` | `/v1/models` | List available models |
| `GET` | `/v1/usage` | Check your usage stats |

### Example

```python
import requests

response = requests.post(
    "http://localhost:8000/api/v1/chat/completions",
    headers={"Authorization": "Bearer sk-rph-your-key"},
    json={
        "model": "rahnuma-1",
        "messages": [{"role": "user", "content": "What is AI?"}]
    }
)
print(response.json()["choices"][0]["message"]["content"])
```

### Rate Limits by Plan

| Plan | Req / Day | Req / Month | Tokens / Month |
|---|---|---|---|
| Free | 100 | 1,000 | 100K |
| Pro | 1,000 | 30,000 | 5M |
| Enterprise | 10,000 | 300,000 | 50M |

---

## Production Deployment

### Server setup (Ubuntu)

```bash
# Clone
git clone https://github.com/Abbastouqi/Rehnuma.git
cd Rehnuma/backend

# Python environment
uv venv .venv --python 3.12
uv pip install -r requirements.txt

# Create .env with production values
nano .env

# Run as systemd service
sudo nano /etc/systemd/system/rahnuma-backend.service
sudo systemctl enable --now rahnuma-backend
```

### Nginx config (key lines)

```nginx
location / {
    root /var/www/rahnuma/dist;
    try_files $uri $uri/ /index.html;
}

location /api/ {
    proxy_pass http://127.0.0.1:8000;
    proxy_buffering off;      # required for SSE streaming
    proxy_read_timeout 300s;
}
```

> **`proxy_buffering off`** is required — without it, chat streaming will not work.

---

## Google OAuth Setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. APIs & Services → Credentials → your OAuth client
3. Add authorized redirect URI: `https://rahnuma.riphah.edu.pk/api/auth/google/callback`
4. APIs & Services → OAuth consent screen → set User Type to **External**

---

## Admin Panel

Access at `/admin` (admin role required).

| Tab | Contents |
|---|---|
| Overview | User, chat, message, document counts |
| Users | View, enable/disable, promote, delete users |
| Chats | All conversations across all users |
| API Keys | All keys, usage per key, activate/revoke |
| Usage Logs | Per-request logs with tokens and latency |

---

## License

Internal use — Riphah International University.
