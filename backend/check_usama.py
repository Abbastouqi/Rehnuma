import asyncio, sys, urllib.request, urllib.error, json
sys.path.insert(0, '.')
import app.models.chat, app.models.bot, app.models.document

BASE = "http://localhost:8000/api"


async def get_token():
    from app.database import AsyncSessionLocal
    from app.models.user import User
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.email == "usama.ali@riphah.edu.pk"))
        u = r.scalar_one_or_none()
        return u.verification_token if u else None


def http(method, path, data=None, token=None):
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read())
        except: return e.code, {}


PASS = 0
FAIL = 0

def check(label, ok, detail=""):
    global PASS, FAIL
    if ok:
        PASS += 1
        print(f"  [PASS] {label}")
    else:
        FAIL += 1
        print(f"  [FAIL] {label}" + (f" -- {detail}" if detail else ""))


print("=" * 55)
print("  Testing account: usama.ali@riphah.edu.pk")
print("=" * 55)

# 1. Confirm user exists in DB
ver_token = asyncio.run(get_token())
check("User registered in database", bool(ver_token))
if not ver_token:
    print("Cannot continue — user not found.")
    sys.exit(1)

# 2. Verify email via token
s, r = http("GET", f"/auth/verify/{ver_token}")
check("Email verification link works", s == 200, str(r))

# 3. Login
s, r = http("POST", "/auth/login", {"username": "usamatest1", "password": "Test1234!"})
check("Login succeeds after verification", s == 200, str(r))
jwt = r.get("access_token", "")
uinfo = r.get("user", {})
check("Correct email on login response", uinfo.get("email") == "usama.ali@riphah.edu.pk")
check("JWT token returned", bool(jwt))

# 4. Authenticated requests work
s, chats = http("GET", "/chats", token=jwt)
check("Authenticated GET /chats works", s == 200)

s, c = http("POST", "/chats", {"title": "Usama First Chat"}, token=jwt)
check("Can create a chat", s == 201)

s, loaded = http("GET", f"/chats/{c.get('id')}", token=jwt)
check("Can load the created chat", s == 200 and loaded.get("title") == "Usama First Chat")

# 5. Email status
print()
print("  Email check:")
print("  - Verification email was sent FROM touqeer.abbas@riphah.edu.pk")
print("  - Verification email was sent TO   usama.ali@riphah.edu.pk")
print("  - Check usama.ali inbox (or Spam) for: 'Verify your Rahnuma account'")

print()
print("=" * 55)
print(f"  RESULTS: {PASS}/{PASS+FAIL} PASSED  |  {FAIL} FAILED")
print("=" * 55)
