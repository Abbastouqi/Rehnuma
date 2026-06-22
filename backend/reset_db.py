"""
Reset script — wipes all users/chats/messages from SQLite and MongoDB, recreates admin.
Run ONCE with: python reset_db.py
"""
import asyncio, sys
sys.path.insert(0, '.')
import app.models.chat, app.models.bot, app.models.document

async def main():
    from app.database import AsyncSessionLocal, engine, init_db
    from app.models.user import User
    from app.models.chat import Chat, Message
    from sqlalchemy import delete, text

    print("Initialising DB schema...")
    await init_db()

    async with AsyncSessionLocal() as db:
        # Delete in correct FK order
        deleted_msgs = (await db.execute(delete(Message))).rowcount
        deleted_chats = (await db.execute(delete(Chat))).rowcount
        deleted_users = (await db.execute(delete(User))).rowcount
        await db.commit()
        print(f"Deleted: {deleted_users} users, {deleted_chats} chats, {deleted_msgs} messages")

    # Wipe MongoDB
    try:
        from app.db.mongodb import connect_mongodb, is_connected, _client
        from app.config import settings
        await connect_mongodb()
        if is_connected():
            from app.models.mongo_user import UserProfile
            from app.models.mongo_chat import ChatHistory
            up = await UserProfile.delete_all()
            ch = await ChatHistory.delete_all()
            print(f"MongoDB: cleared user_profiles, chat_history")
        else:
            print("MongoDB: not connected, skipped")
    except Exception as e:
        print(f"MongoDB: {e}")

    # Re-create admin
    async with AsyncSessionLocal() as db:
        from app.utils.security import hash_password
        admin = User(
            username="admin",
            email="admin@riphah.edu.pk",
            hashed_password=hash_password("admin123"),
            role="admin",
            is_verified=True,
        )
        db.add(admin)
        await db.commit()
        print("Admin user recreated: username=admin  password=admin123")

    print("\nDone! The database is clean. You can now register fresh accounts.")

asyncio.run(main())
