import urllib.request, urllib.error, json, sys
sys.path.insert(0, '.')

BASE = "http://localhost:8000/api"

def post(path, data, token=""):
    body = json.dumps(data).encode()
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(f"{BASE}{path}", data=body, headers=headers, method="POST")
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

def get(path, token):
    req = urllib.request.Request(f"{BASE}{path}", headers={"Authorization": f"Bearer {token}"})
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read())

# 1. Login
data = post("/auth/login", {"username": "admin", "password": "admin123"})
tok = data["access_token"]
print("Logged in as admin")

# 2. Create a fresh chat
c = post("/chats", {"title": "LLM Test"}, tok)
cid = c["id"]
print(f"Created chat id={cid}")

# 3. Verify GET works (the fix)
detail = get(f"/chats/{cid}", tok)
msg_count = len(detail["messages"])
status = "PASS" if detail.get("title") == "LLM Test" else "FAIL"
print(f"[{status}] GET /chats/{{id}} returns chat with title: {detail.get('title')}")
print(f"  Messages in DB: {msg_count}")

# 4. Send a message via SSE and wait for [DONE]
print("\nSending message to LLM (this may take 10-30s)...")
import urllib.parse
token_val = tok

req = urllib.request.Request(
    f"{BASE}/chats/{cid}/messages",
    data=json.dumps({"content": "Say exactly: Hello World"}).encode(),
    headers={"Content-Type": "application/json", "Authorization": f"Bearer {tok}"},
    method="POST",
)
full_response = ""
try:
    with urllib.request.urlopen(req, timeout=60) as r:
        for raw_line in r:
            line = raw_line.decode("utf-8").strip()
            if not line.startswith("data: "):
                continue
            data_part = line[6:]
            if data_part == "[DONE]":
                break
            try:
                token_chunk = json.loads(data_part)
                full_response += token_chunk
                sys.stdout.write(token_chunk)
                sys.stdout.flush()
            except Exception:
                pass
    print()
except Exception as e:
    print(f"\nSSE Error: {e}")

print(f"\nFull response length: {len(full_response)} chars")

# 5. Check DB now has 2 messages
import time
time.sleep(1)
detail2 = get(f"/chats/{cid}", tok)
msgs = detail2["messages"]
print(f"Messages in DB after send: {len(msgs)}")
for m in msgs:
    print(f"  [{m['role']}] {m['content'][:60]}")

if len(msgs) == 2:
    print("\n[PASS] LLM response saved correctly — chat persistence WORKS")
else:
    print(f"\n[FAIL] Expected 2 messages, got {len(msgs)}")
