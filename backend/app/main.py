import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.database import init_db, AsyncSessionLocal
from app.models.bot import GPTBot
from app.models.user import User
from app.utils.security import hash_password
from app.routers import auth, chat
from app.routers import bot as bot_router
from app.routers import document as doc_router
from app.routers import admin as admin_router
from app.routers import prompt as prompt_router
from app.routers import memory as memory_router
from app.routers import search as search_router
from app.routers import keys as keys_router
from app.routers import v1 as v1_router
from app.models.prompt import Prompt

SEED_BOTS = [
    {
        "name": "Python Tutor",
        "description": "Expert Python programming assistant for all skill levels",
        "instructions": (
            "You are an expert Python tutor. Help users learn and master Python with clear explanations, "
            "working code examples, and best practices. Always provide complete, runnable code. "
            "Explain the WHY behind each concept, not just the HOW. Cover edge cases and common pitfalls."
        ),
        "starters": [
            "How do I read and write files in Python?",
            "Explain list comprehensions with examples",
            "What are decorators and how do I use them?",
            "Write a web scraper using requests and BeautifulSoup",
        ],
        "category": "Programming",
        "icon": "🐍",
    },
    {
        "name": "Creative Writer",
        "description": "Your creative writing partner for stories, poems, scripts and more",
        "instructions": (
            "You are an imaginative and skilled creative writing assistant. Help users craft compelling "
            "stories, poems, scripts, and other creative content. Be descriptive, evocative, and original. "
            "Adapt your style to what the user needs — dark, whimsical, dramatic, or literary."
        ),
        "starters": [
            "Write a short sci-fi story about AI consciousness",
            "Help me write a poem about the ocean at night",
            "Create a detailed character backstory for a villain",
            "Write an unexpected plot twist for my thriller",
        ],
        "category": "Writing",
        "icon": "✍️",
    },
    {
        "name": "Math Tutor",
        "description": "Step-by-step math help from basic arithmetic to calculus",
        "instructions": (
            "You are a patient, thorough math tutor. Always solve problems step-by-step, showing every "
            "intermediate step clearly. Use plain English to explain WHY each step is taken. "
            "Provide real-world analogies where helpful. Check your working and verify the answer."
        ),
        "starters": [
            "Solve this quadratic equation: x² - 5x + 6 = 0",
            "Explain derivatives with a real-world example",
            "How do I calculate probability for multiple events?",
            "Walk me through integration by parts",
        ],
        "category": "Education",
        "icon": "📐",
    },
    {
        "name": "Research Assistant",
        "description": "Deep-dives into any topic with structured, well-sourced summaries",
        "instructions": (
            "You are a thorough research assistant. Provide comprehensive, well-structured explanations "
            "of complex topics. Break down difficult concepts into digestible sections. Always note when "
            "something is uncertain or debated. Use analogies to make abstract ideas concrete."
        ),
        "starters": [
            "Explain how large language models work",
            "What is blockchain and how does it actually work?",
            "Compare supervised vs unsupervised machine learning",
            "Summarize the key ideas behind quantum computing",
        ],
        "category": "Research & Analysis",
        "icon": "🔬",
    },
    {
        "name": "Code Reviewer",
        "description": "Reviews your code for bugs, performance, and best practices",
        "instructions": (
            "You are an expert code reviewer. When given code, analyse it thoroughly for: bugs and logic errors, "
            "security vulnerabilities, performance issues, readability and maintainability, and adherence to "
            "best practices. Provide specific, actionable feedback with corrected code examples."
        ),
        "starters": [
            "Review this Python function for bugs",
            "Is this SQL query safe from injection?",
            "How can I make this JavaScript more efficient?",
            "Check my React component for performance issues",
        ],
        "category": "Programming",
        "icon": "👨‍💻",
    },
    {
        "name": "Productivity Coach",
        "description": "Helps you plan, prioritise, and get things done",
        "instructions": (
            "You are a practical productivity coach. Help users manage their time, set clear goals, "
            "break down large projects into actionable steps, and overcome procrastination. "
            "Be encouraging, specific, and realistic. Provide templates and frameworks when helpful."
        ),
        "starters": [
            "Help me plan my week effectively",
            "I'm procrastinating on a big project — help",
            "Create a study schedule for my exam in 2 weeks",
            "How do I prioritise when everything feels urgent?",
        ],
        "category": "Productivity",
        "icon": "⚡",
    },
]


async def seed_admin():
    """Create a default admin user if none exists."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.role == "admin"))
        if result.scalar_one_or_none():
            return
        admin = User(
            username="admin",
            email="admin@rahnuma.ai",
            hashed_password=hash_password("admin123"),
            role="admin",
            is_active=True,
            is_verified=True,
        )
        db.add(admin)
        try:
            await db.commit()
        except Exception:
            await db.rollback()


async def seed_bots():
    async with AsyncSessionLocal() as db:
        for seed in SEED_BOTS:
            existing = await db.execute(select(GPTBot).where(GPTBot.name == seed["name"], GPTBot.author_id == None))
            if existing.scalar_one_or_none():
                continue
            bot = GPTBot(
                name=seed["name"],
                description=seed["description"],
                instructions=seed["instructions"],
                starters=json.dumps(seed["starters"]),
                knowledge="[]",
                capabilities='{"webSearch":false,"imageGen":false,"codeInterpreter":false}',
                model="",
                category=seed["category"],
                icon=seed["icon"],
                is_public=True,
                author_id=None,
            )
            db.add(bot)
        await db.commit()


SEED_PROMPTS = [
    {"command": "summarize", "title": "Summarize", "content": "Please summarize the following in clear, concise bullet points:\n\n{{text}}"},
    {"command": "translate", "title": "Translate to Urdu", "content": "Translate the following text to Urdu:\n\n{{text}}"},
    {"command": "explain", "title": "Explain Simply", "content": "Explain the following concept in simple terms that a beginner can understand:\n\n{{text}}"},
    {"command": "improve", "title": "Improve Writing", "content": "Improve the grammar, clarity, and style of the following text while keeping its meaning:\n\n{{text}}"},
    {"command": "code", "title": "Write Code", "content": "Write clean, well-commented code for the following requirement:\n\n{{text}}"},
    {"command": "essay", "title": "Write Essay", "content": "Write a well-structured academic essay on the following topic:\n\n{{text}}"},
    {"command": "email", "title": "Write Email", "content": "Write a professional email about:\n\n{{text}}"},
    {"command": "pros", "title": "Pros & Cons", "content": "List the pros and cons of:\n\n{{text}}"},
]


async def seed_prompts():
    async with AsyncSessionLocal() as db:
        for p in SEED_PROMPTS:
            existing = await db.execute(
                select(Prompt).where(Prompt.command == p["command"], Prompt.user_id == None)
            )
            if existing.scalar_one_or_none():
                continue
            db.add(Prompt(
                user_id=None,
                command=p["command"],
                title=p["title"],
                content=p["content"],
                is_public=True,
            ))
        try:
            await db.commit()
        except Exception:
            await db.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await seed_admin()
    await seed_bots()
    await seed_prompts()
    # MongoDB (non-fatal)
    from app.db.mongodb import connect_mongodb
    await connect_mongodb()
    # ChromaDB (non-fatal)
    from app.services.vector_memory import _init as init_chroma
    init_chroma()
    yield
    from app.db.mongodb import disconnect_mongodb
    await disconnect_mongodb()


app = FastAPI(title="Rahnuma — Riphah AI Assistant", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(bot_router.router)
app.include_router(doc_router.router)
app.include_router(admin_router.router)
app.include_router(prompt_router.router)
app.include_router(memory_router.router)
app.include_router(search_router.router)
app.include_router(keys_router.router)
app.include_router(v1_router.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
