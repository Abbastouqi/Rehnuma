import aiosqlite
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        yield session


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _migrate()


async def _migrate():
    """Add columns introduced after initial schema without dropping existing data."""
    db_path = settings.DATABASE_URL.replace("sqlite+aiosqlite:///", "")
    async with aiosqlite.connect(db_path) as db:
        migrations = [
            "ALTER TABLE chats ADD COLUMN bot_id INTEGER REFERENCES bots(id)",
            "ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user'",
            "ALTER TABLE users ADD COLUMN is_active INTEGER DEFAULT 1",
            "ALTER TABLE chats ADD COLUMN is_pinned INTEGER DEFAULT 0",
            "ALTER TABLE chats ADD COLUMN is_archived INTEGER DEFAULT 0",
            "ALTER TABLE chats ADD COLUMN folder TEXT",
            # Email verification — existing users default to verified=1 so they are not locked out
            "ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 1",
            "ALTER TABLE users ADD COLUMN verification_token TEXT",
            "ALTER TABLE users ADD COLUMN verification_expires TEXT",
            "ALTER TABLE users ADD COLUMN reset_token TEXT",
            "ALTER TABLE users ADD COLUMN reset_expires TEXT",
            "ALTER TABLE users ADD COLUMN google_id TEXT",
            "ALTER TABLE users ADD COLUMN profile_picture TEXT",
            # API Platform — user plan
            "ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'free'",
            # API Platform — api_keys table
            "CREATE TABLE IF NOT EXISTS api_keys (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, name TEXT NOT NULL, key_prefix TEXT NOT NULL, key_hash TEXT NOT NULL UNIQUE, plan TEXT DEFAULT 'free', is_active INTEGER DEFAULT 1, requests_today INTEGER DEFAULT 0, requests_month INTEGER DEFAULT 0, tokens_month INTEGER DEFAULT 0, last_used_at DATETIME, day_reset_at DATETIME, month_reset_at DATETIME, created_at DATETIME)",
            # API Platform — usage_logs table
            "CREATE TABLE IF NOT EXISTS usage_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL, user_id INTEGER REFERENCES users(id) ON DELETE SET NULL, endpoint TEXT DEFAULT '/v1/chat/completions', model TEXT DEFAULT '', input_tokens INTEGER DEFAULT 0, output_tokens INTEGER DEFAULT 0, latency_ms INTEGER DEFAULT 0, status_code INTEGER DEFAULT 200, error TEXT, ip_address TEXT, created_at DATETIME)",
            # API Platform — indexes
            "CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash)",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_key ON usage_logs(api_key_id)",
            "CREATE INDEX IF NOT EXISTS idx_usage_logs_user ON usage_logs(user_id)",
        ]
        for sql in migrations:
            try:
                await db.execute(sql)
                await db.commit()
            except Exception:
                pass
