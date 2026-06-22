import certifi
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie
from app.config import settings

_client: AsyncIOMotorClient | None = None


async def connect_mongodb():
    global _client
    try:
        from app.models.mongo_user import UserProfile
        from app.models.mongo_chat import ChatHistory
        # tlsCAFile=certifi.where() fixes SSL handshake on Python 3.14 + OpenSSL 3.0
        _client = AsyncIOMotorClient(
            settings.MONGODB_URL,
            serverSelectionTimeoutMS=8000,
            tlsCAFile=certifi.where(),
        )
        # Ping to verify connection actually works before marking as connected
        await _client.admin.command("ping")
        db = _client[settings.MONGODB_DB]
        await init_beanie(database=db, document_models=[UserProfile, ChatHistory])
        # Ensure collections exist immediately so they appear in Compass
        for coll_name in ["user_profiles", "chat_history"]:
            try:
                await db.create_collection(coll_name)
            except Exception:
                pass  # Already exists
        print(f"[MongoDB] Connected to Atlas — db: {settings.MONGODB_DB}")
    except Exception as e:
        print(f"[MongoDB] Connection failed (non-fatal): {str(e)[:120]}")
        _client = None


async def disconnect_mongodb():
    global _client
    if _client:
        _client.close()
        _client = None


def is_connected() -> bool:
    return _client is not None
