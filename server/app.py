"""小学英语乐园 后端：账号 + 背单词进度同步（SQLite）。"""
import os, re, json, time, sqlite3, secrets, hashlib, hmac, threading
from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

DB = os.environ.get("DB_PATH", "/data/app.db")
WEB = os.environ.get("WEB_DIR", os.path.join(os.path.dirname(__file__), "..", "web"))
MEDIA = os.environ.get("MEDIA_DIR", os.path.join(WEB, "media"))
REG_CODE = os.environ.get("REGISTER_CODE", "")  # 留空=开放注册
COOKIE = "kid_sess"
SESSION_DAYS = 180
_lock = threading.Lock()

def db():
    c = sqlite3.connect(DB, timeout=10)
    c.row_factory = sqlite3.Row
    return c

def init():
    os.makedirs(os.path.dirname(DB), exist_ok=True)
    with db() as c:
        c.executescript("""
        create table if not exists users(id integer primary key, username text unique collate nocase,
          nickname text, avatar text, pw text, created integer);
        create table if not exists sessions(token text primary key, uid integer, expires integer);
        create table if not exists progress(uid integer primary key, srs text, settings text, updated integer);
        """)
init()

def hash_pw(pw, salt=None):
    salt = salt or secrets.token_bytes(16)
    h = hashlib.scrypt(pw.encode(), salt=salt, n=2**14, r=8, p=1, dklen=32)
    return salt.hex() + "$" + h.hex()

def check_pw(pw, stored):
    s, h = stored.split("$")
    return hmac.compare_digest(hash_pw(pw, bytes.fromhex(s)).split("$")[1], h)

# 简单限流：每 IP 每 10 分钟 30 次登录/注册尝试
_hits = {}
def limit(req: Request, key):
    ip = req.headers.get("cf-connecting-ip") or (req.client.host if req.client else "?")
    now = time.time(); k = (key, ip)
    arr = [t for t in _hits.get(k, []) if now - t < 600]
    if len(arr) >= 30: raise HTTPException(429, "尝试太频繁啦，请过几分钟再试")
    arr.append(now); _hits[k] = arr

def current(req: Request):
    tok = req.cookies.get(COOKIE)
    if not tok: return None
    with db() as c:
        r = c.execute("select u.* from sessions s join users u on u.id=s.uid where s.token=? and s.expires>?",
                      (hashlib.sha256(tok.encode()).hexdigest(), int(time.time()))).fetchone()
    return r

def need(req):
    u = current(req)
    if not u: raise HTTPException(401, "请先登录")
    return u

def new_session(resp: Response, uid):
    tok = secrets.token_urlsafe(32)
    with db() as c:
        c.execute("insert into sessions values(?,?,?)", (hashlib.sha256(tok.encode()).hexdigest(), uid, int(time.time()) + SESSION_DAYS * 86400))
        c.execute("delete from sessions where expires<?", (int(time.time()),))
    resp.set_cookie(COOKIE, tok, max_age=SESSION_DAYS * 86400, httponly=True, samesite="lax", secure=True)

def pub(u):
    return {"username": u["username"], "nickname": u["nickname"] or u["username"], "avatar": u["avatar"] or "🐼"}

app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)

@app.post("/api/register")
async def register(req: Request):
    limit(req, "reg")
    b = await req.json()
    un = (b.get("username") or "").strip(); pw = b.get("password") or ""
    if REG_CODE and b.get("code") != REG_CODE: raise HTTPException(400, "邀请码不对哦")
    if not re.fullmatch(r"[A-Za-z0-9_\u4e00-\u9fa5]{2,20}", un): raise HTTPException(400, "用户名 2–20 位：字母、数字、下划线或中文")
    if len(pw) < 4 or len(pw) > 64: raise HTTPException(400, "密码至少 4 位")
    nick = (b.get("nickname") or un).strip()[:20]; av = (b.get("avatar") or "🐼")[:4]
    try:
        with db() as c:
            cur = c.execute("insert into users(username,nickname,avatar,pw,created) values(?,?,?,?,?)", (un, nick, av, hash_pw(pw), int(time.time())))
            uid = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(400, "这个用户名已经有人用啦")
    resp = JSONResponse({"ok": True, "user": {"username": un, "nickname": nick, "avatar": av}})
    new_session(resp, uid); return resp

@app.post("/api/login")
async def login(req: Request):
    limit(req, "login")
    b = await req.json()
    with db() as c:
        u = c.execute("select * from users where username=?", ((b.get("username") or "").strip(),)).fetchone()
    if not u or not check_pw(b.get("password") or "", u["pw"]): raise HTTPException(400, "用户名或密码不对")
    resp = JSONResponse({"ok": True, "user": pub(u)}); new_session(resp, u["id"]); return resp

@app.post("/api/logout")
async def logout(req: Request):
    tok = req.cookies.get(COOKIE)
    if tok:
        with db() as c: c.execute("delete from sessions where token=?", (hashlib.sha256(tok.encode()).hexdigest(),))
    resp = JSONResponse({"ok": True}); resp.delete_cookie(COOKIE); return resp

@app.get("/api/me")
async def me(req: Request):
    u = current(req)
    return {"user": pub(u) if u else None, "register_code": bool(REG_CODE)}

@app.post("/api/profile")
async def profile(req: Request):
    u = need(req); b = await req.json()
    nick = (b.get("nickname") or u["nickname"]).strip()[:20]; av = (b.get("avatar") or u["avatar"])[:4]
    with db() as c: c.execute("update users set nickname=?,avatar=? where id=?", (nick, av, u["id"]))
    if b.get("new_password"):
        if not check_pw(b.get("old_password") or "", u["pw"]): raise HTTPException(400, "原密码不对")
        if len(b["new_password"]) < 4: raise HTTPException(400, "新密码至少 4 位")
        with db() as c: c.execute("update users set pw=? where id=?", (hash_pw(b["new_password"]), u["id"]))
    return {"ok": True}

def merge(a: dict, b: dict):
    """逐词合并：保留最近一次复习（t 较大）的记录。"""
    out = dict(a)
    for k, v in (b or {}).items():
        if not isinstance(v, dict): continue
        if k not in out or (v.get("t", 0) or 0) >= (out[k].get("t", 0) or 0): out[k] = v
    return out

@app.get("/api/progress")
async def get_progress(req: Request):
    u = need(req)
    with db() as c: r = c.execute("select * from progress where uid=?", (u["id"],)).fetchone()
    if not r: return {"srs": {}, "settings": {}, "updated": 0}
    return {"srs": json.loads(r["srs"] or "{}"), "settings": json.loads(r["settings"] or "{}"), "updated": r["updated"]}

@app.put("/api/progress")
async def put_progress(req: Request):
    u = need(req); b = await req.json()
    raw = await req.body()
    if len(raw) > 3_000_000: raise HTTPException(413, "数据太大")
    with _lock, db() as c:
        r = c.execute("select * from progress where uid=?", (u["id"],)).fetchone()
        srs = merge(json.loads(r["srs"]) if r else {}, b.get("srs") or {})
        settings = b.get("settings") if isinstance(b.get("settings"), dict) else (json.loads(r["settings"]) if r else {})
        now = int(time.time() * 1000)
        c.execute("insert or replace into progress values(?,?,?,?)", (u["id"], json.dumps(srs, separators=(",", ":")), json.dumps(settings), now))
    return {"srs": srs, "settings": settings, "updated": now}

@app.get("/healthz")
async def health(): return {"ok": True}

app.mount("/media", StaticFiles(directory=MEDIA, check_dir=False), name="media")

@app.middleware("http")
async def cache_headers(req: Request, call_next):
    resp = await call_next(req)
    p = req.url.path
    if p.startswith("/media/"): resp.headers["Cache-Control"] = "public, max-age=2592000, immutable"
    elif p.startswith("/api/"): resp.headers["Cache-Control"] = "no-store"
    else: resp.headers["Cache-Control"] = "no-cache"
    return resp

app.mount("/", StaticFiles(directory=WEB, html=True), name="web")
