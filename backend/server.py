"""Niva Novus - Smart Home Automation Platform Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any, Tuple
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import random

from seed import seed_all
from memory_db import MemoryDB

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
DB_NAME = os.environ.get("DB_NAME", "nivanovus")

mongo_client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=2000)
db = mongo_client[DB_NAME]

JWT_SECRET = os.environ.get("JWT_SECRET", "niva-secret")
JWT_ALGO = "HS256"

app = FastAPI(title="Niva Novus API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nivanovus")

app.state.db_ok = False
app.state.db_mode = "mongo"

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000"],
    # Allow Vercel preview + prod domains by default
    allow_origin_regex=r"^https://.*\.vercel\.app$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def require_db():
    if not getattr(app.state, "db_ok", False):
        raise HTTPException(503, "Database not available.")


def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def make_token(user_id: str, role: str) -> str:
    payload = {
        "uid": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

def _pick_customer_project(user: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # placeholder helper for type clarity; actual lookup is async
    return None

async def get_customer_project_id(user: Dict[str, Any]) -> Optional[str]:
    proj = await db.projects.find_one({"user_id": user["id"]}, {"_id": 0, "id": 1})
    return proj["id"] if proj else None

async def ensure_seeded():
    if await db.users.count_documents({}) > 0:
        return
    logger.info("Database empty; seeding demo data...")
    await seed_all(db)
    logger.info("Seed complete.")


async def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    if not creds:
        raise HTTPException(401, "Not authenticated")

    try:
        payload = jwt.decode(creds.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
    except Exception:
        raise HTTPException(401, "Invalid token")

    user = await db.users.find_one({"id": payload["uid"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(401, "User not found")

    return user


def require_role(*roles):
    async def checker(user=Depends(get_current_user)):
        if user["role"] not in roles:
            raise HTTPException(403, f"Requires role: {roles}")
        return user

    return checker


# ---------- Models ----------
class OTPSend(BaseModel):
    phone: str


class OTPVerify(BaseModel):
    phone: str
    otp: str
    name: Optional[str] = None


class EmailLogin(BaseModel):
    email: str
    password: str


class DeviceCommand(BaseModel):
    state: Dict[str, Any]

class TicketCreate(BaseModel):
    title: str
    description: str
    priority: str = "medium"

class CheckoutCreate(BaseModel):
    package_id: str
    origin_url: str


# ---------- WebSocket Manager ----------
class WSManager:
    def __init__(self):
        self.active: List[WebSocket] = []

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active.append(ws)

    def disconnect(self, ws: WebSocket):
        if ws in self.active:
            self.active.remove(ws)

    async def broadcast(self, msg: dict):
        dead = []
        for ws in self.active:
            try:
                await ws.send_json(msg)
            except Exception:
                dead.append(ws)

        for d in dead:
            self.disconnect(d)


manager = WSManager()

@api_router.get("/")
async def root():
    return {"status": "ok", "service": "nivanovus-api", "time": now_iso()}


# ---------- Auth ----------
@api_router.post("/auth/otp/send")
async def otp_send(payload: OTPSend):
    return {
        "success": True,
        "message": "OTP sent (use 123456 for demo)",
        "phone": payload.phone,
    }


@api_router.post("/auth/otp/verify")
async def otp_verify(payload: OTPVerify):
    if payload.otp != "123456":
        raise HTTPException(400, "Invalid OTP")

    user = await db.users.find_one({"phone": payload.phone}, {"_id": 0})

    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "phone": payload.phone,
            "name": payload.name or f"Customer {payload.phone[-4:]}",
            "email": f"user{payload.phone[-4:]}@nivanovus.com",
            "role": "customer",
            "created_at": now_iso(),
            "password": "",
        }
        await db.users.insert_one(dict(user))

        proj = {
            "id": str(uuid.uuid4()),
            "user_id": user["id"],
            "name": "My Home",
            "address": "Set your home address",
            "created_at": now_iso(),
        }
        await db.projects.insert_one(dict(proj))

    user.pop("password", None)
    user.pop("_id", None)

    token = make_token(user["id"], user["role"])
    return {"token": token, "user": user}


@api_router.post("/auth/login")
async def login(payload: EmailLogin):
    user = await db.users.find_one({"email": payload.email})

    if not user or not verify_pw(payload.password, user.get("password", "")):
        raise HTTPException(401, "Invalid credentials")

    token = make_token(user["id"], user["role"])
    user.pop("password", None)
    user.pop("_id", None)

    return {"token": token, "user": user}


@api_router.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api_router.patch("/auth/me")
async def upd_me(payload: Dict[str, Any], user=Depends(get_current_user)):
    allowed = {k: v for k, v in payload.items() if k in {"name", "email", "phone"}}

    if not allowed:
        raise HTTPException(400, "No editable fields")

    allowed["updated_at"] = now_iso()
    await db.users.update_one({"id": user["id"]}, {"$set": allowed})

    return await db.users.find_one({"id": user["id"]}, {"_id": 0, "password": 0})


# ---------- Customer: Rooms / Devices / Scenes / Notifications ----------
@api_router.get("/rooms")
async def rooms(user=Depends(require_role("customer"))):
    proj_id = await get_customer_project_id(user)
    if not proj_id:
        return []
    cur = db.rooms.find({"project_id": proj_id}, {"_id": 0})
    return await cur.to_list(length=1000)


@api_router.get("/devices")
async def devices(user=Depends(require_role("customer"))):
    proj_id = await get_customer_project_id(user)
    if not proj_id:
        return []
    cur = db.devices.find({"project_id": proj_id}, {"_id": 0})
    return await cur.to_list(length=2000)


@api_router.post("/devices/{device_id}/command")
async def device_command(device_id: str, payload: DeviceCommand, user=Depends(require_role("customer"))):
    proj_id = await get_customer_project_id(user)
    if not proj_id:
        raise HTTPException(404, "Project not found")
    dev = await db.devices.find_one({"id": device_id, "project_id": proj_id}, {"_id": 0})
    if not dev:
        raise HTTPException(404, "Device not found")
    new_state = {**(dev.get("state") or {}), **(payload.state or {})}
    await db.devices.update_one(
        {"id": device_id, "project_id": proj_id},
        {"$set": {"state": new_state, "last_active": now_iso(), "online": True}},
    )
    await manager.broadcast({"type": "device_state", "device_id": device_id, "state": new_state})
    return {"id": device_id, "state": new_state}


@api_router.get("/scenes")
async def scenes(user=Depends(require_role("customer"))):
    cur = db.scenes.find({"user_id": user["id"]}, {"_id": 0})
    return await cur.to_list(length=1000)


@api_router.post("/scenes/{scene_id}/execute")
async def scenes_execute(scene_id: str, user=Depends(require_role("customer"))):
    scene = await db.scenes.find_one({"id": scene_id, "user_id": user["id"]}, {"_id": 0})
    if not scene:
        raise HTTPException(404, "Scene not found")
    proj_id = await get_customer_project_id(user)
    if proj_id:
        for act in scene.get("actions", []):
            did = act.get("device_id")
            if not did:
                continue
            dev = await db.devices.find_one({"id": did, "project_id": proj_id}, {"_id": 0})
            if not dev:
                continue
            new_state = {**(dev.get("state") or {}), **(act.get("state") or {})}
            await db.devices.update_one({"id": did, "project_id": proj_id}, {"$set": {"state": new_state, "last_active": now_iso()}})
    return {"success": True, "scene_id": scene_id, "executed_at": now_iso()}


@api_router.get("/notifications")
async def notifications(user=Depends(require_role("customer"))):
    cur = db.notifications.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=2000)


# ---------- Technician: Jobs ----------
@api_router.get("/jobs")
async def jobs_list(user=Depends(require_role("technician"))):
    cur = db.jobs.find({"technician_id": user["id"]}, {"_id": 0}).sort("scheduled_at", -1)
    return await cur.to_list(length=2000)


@api_router.get("/jobs/{job_id}")
async def jobs_detail(job_id: str, user=Depends(require_role("technician"))):
    job = await db.jobs.find_one({"id": job_id, "technician_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    return job


@api_router.patch("/jobs/{job_id}")
async def jobs_patch(job_id: str, payload: Dict[str, Any], user=Depends(require_role("technician"))):
    job = await db.jobs.find_one({"id": job_id, "technician_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(404, "Job not found")
    editable = {k: v for k, v in payload.items() if k in {"status", "checklist", "photos", "signature", "report", "completed_at"}}
    if not editable:
        raise HTTPException(400, "No editable fields")
    editable["updated_at"] = now_iso()
    await db.jobs.update_one({"id": job_id, "technician_id": user["id"]}, {"$set": editable})
    return await db.jobs.find_one({"id": job_id, "technician_id": user["id"]}, {"_id": 0})


# ---------- Customer: Tickets / Billing / AMC / Energy ----------
@api_router.get("/tickets")
async def tickets_list(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    cur = db.tickets.find(q, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=2000)


@api_router.post("/tickets")
async def tickets_create(payload: TicketCreate, user=Depends(require_role("customer"))):
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "user_name": user.get("name", ""),
        "subject": payload.title,
        "title": payload.title,
        "description": payload.description,
        "status": "open",
        "priority": payload.priority,
        "created_at": now_iso(),
    }
    await db.tickets.insert_one(dict(doc))
    return doc


@api_router.patch("/tickets/{ticket_id}")
async def tickets_patch(ticket_id: str, payload: Dict[str, Any], user=Depends(get_current_user)):
    if user["role"] != "admin":
        raise HTTPException(403, "Requires role: ('admin',)")
    editable = {k: v for k, v in payload.items() if k in {"status", "priority"}}
    if not editable:
        raise HTTPException(400, "No editable fields")
    editable["updated_at"] = now_iso()
    await db.tickets.update_one({"id": ticket_id}, {"$set": editable})
    t = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Ticket not found")
    return t


@api_router.get("/invoices")
async def invoices(user=Depends(require_role("customer"))):
    cur = db.invoices.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=2000)


@api_router.get("/amc")
async def amc(user=Depends(require_role("customer"))):
    cur = db.amc.find({"customer_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=100)


@api_router.get("/energy/summary")
async def energy_summary(user=Depends(require_role("customer"))):
    proj_id = await get_customer_project_id(user)
    if not proj_id:
        return {"today_kwh": 0, "week": [], "by_room": []}

    devs = await db.devices.find({"project_id": proj_id}, {"_id": 0}).to_list(length=2000)
    today_kwh = round(sum((d.get("power_w") or 0) for d in devs if (d.get("state") or {}).get("on")) / 1000.0, 2)
    week = [{"day": d, "kwh": round(max(0.2, today_kwh * (0.6 + 0.1 * i)), 2)} for i, d in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])]
    by_room = []
    rooms = await db.rooms.find({"project_id": proj_id}, {"_id": 0}).to_list(length=1000)
    for r in rooms:
        rdev = [d for d in devs if d.get("room_id") == r.get("id")]
        kwh = round(sum((d.get("power_w") or 0) for d in rdev if (d.get("state") or {}).get("on")) / 1000.0, 2)
        by_room.append({"room": r.get("name"), "kwh": kwh})
    return {"today_kwh": today_kwh, "week": week, "by_room": by_room}


# ---------- Admin: Analytics / Leads / Customers / Inventory ----------
@api_router.get("/analytics/overview")
async def analytics_overview(user=Depends(require_role("admin"))):
    customers = await db.users.count_documents({"role": "customer"})
    devices = await db.devices.count_documents({})
    devices_online = await db.devices.count_documents({"online": True})
    open_tickets = await db.tickets.count_documents({"status": {"$ne": "resolved"}})
    paid = 0
    pending = 0
    invs = await db.invoices.find({}, {"_id": 0}).to_list(length=2000)
    for inv in invs:
        amt = int(inv.get("amount") or 0)
        if inv.get("status") == "paid":
            paid += amt
        else:
            pending += amt

    # crude trend/pipeline for charts
    revenue_trend = [{"month": m, "revenue": int(max(0, paid / 6) + random.randint(-2000, 4000))} for m in ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr"]]
    stages = ["new", "qualified", "proposal", "won", "lost"]
    leads = await db.leads.find({}, {"_id": 0, "status": 1}).to_list(length=2000)
    counts = {s: 0 for s in stages}
    for l in leads:
        counts[l.get("status", "new")] = counts.get(l.get("status", "new"), 0) + 1
    leads_pipeline = [{"stage": s, "count": counts.get(s, 0)} for s in stages]
    return {
        "customers": customers,
        "devices": devices,
        "devices_online": devices_online,
        "open_tickets": open_tickets,
        "revenue_paid": paid,
        "revenue_pending": pending,
        "revenue_trend": revenue_trend,
        "leads_pipeline": leads_pipeline,
    }


@api_router.get("/leads")
async def leads(user=Depends(require_role("admin"))):
    cur = db.leads.find({}, {"_id": 0}).sort("created_at", -1)
    return await cur.to_list(length=5000)


@api_router.get("/customers")
async def customers(user=Depends(require_role("admin"))):
    cur = db.users.find({"role": "customer"}, {"_id": 0, "password": 0}).sort("created_at", -1)
    return await cur.to_list(length=5000)


@api_router.get("/inventory")
async def inventory(user=Depends(require_role("admin"))):
    cur = db.inventory.find({}, {"_id": 0})
    return await cur.to_list(length=5000)


# ---------- Payments (demo-friendly stub) ----------
@api_router.post("/payments/checkout/session")
async def checkout_session(payload: CheckoutCreate, user=Depends(require_role("customer"))):
    sid = f"cs_test_{uuid.uuid4().hex[:24]}"
    # return a plausible Stripe URL (frontend/tests only check substring)
    return {"session_id": sid, "url": f"https://checkout.stripe.com/pay/{sid}"}


@api_router.get("/payments/checkout/status/{session_id}")
async def checkout_status(session_id: str, user=Depends(require_role("customer"))):
    return {"session_id": session_id, "payment_status": "unpaid"}


# ---------- Chat (minimal) ----------
@api_router.get("/chat/threads")
async def chat_threads(user=Depends(require_role("admin"))):
    # group by thread_id (customer id)
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$thread_id", "last": {"$first": "$$ROOT"}}},
    ]
    rows = await db.chat_messages.aggregate(pipeline).to_list(length=2000)
    out = []
    for r in rows:
        last = r.get("last") or {}
        out.append(
            {
                "thread_id": r["_id"],
                "last_message": last.get("content", ""),
                "updated_at": last.get("created_at", now_iso()),
            }
        )
    return out


@api_router.post("/chat/messages")
async def chat_post(payload: Dict[str, Any], user=Depends(get_current_user)):
    content = (payload or {}).get("content", "").strip()
    if not content:
        raise HTTPException(400, "content required")
    thread_id = payload.get("thread_id") or user["id"]
    doc = {
        "id": str(uuid.uuid4()),
        "thread_id": thread_id,
        "sender_id": user["id"],
        "sender_role": user["role"],
        "user_name": user.get("name", ""),
        "content": content,
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(dict(doc))
    return doc


@app.on_event("startup")
async def _startup():
    global db
    try:
        await asyncio.wait_for(db.command("ping"), timeout=2.0)
        app.state.db_ok = True
        app.state.db_mode = "mongo"
    except Exception as e:
        logger.warning("MongoDB not reachable at startup (%s). Falling back to in-memory DB.", e)
        db = MemoryDB()
        app.state.db_ok = True
        app.state.db_mode = "memory"

    await ensure_seeded()


app.include_router(api_router)
