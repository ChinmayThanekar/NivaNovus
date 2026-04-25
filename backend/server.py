"""Niva Novus - Smart Home Automation Platform Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, WebSocket, WebSocketDisconnect, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ.get('JWT_SECRET', 'niva-secret')
JWT_ALGO = "HS256"

app = FastAPI(title="Niva Novus API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ---------- Helpers ----------
def now_iso():
    return datetime.now(timezone.utc).isoformat()

def hash_pw(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()

def verify_pw(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False

def make_token(user_id: str, role: str) -> str:
    payload = {"uid": user_id, "role": role, "exp": datetime.now(timezone.utc) + timedelta(days=30)}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Dict[str, Any]:
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

class CreateModel(BaseModel):
    data: Dict[str, Any]

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

# ---------- Auth ----------
@api_router.post("/auth/otp/send")
async def otp_send(payload: OTPSend):
    # Mock - always returns success, OTP is fixed 123456
    return {"success": True, "message": "OTP sent (use 123456 for demo)", "phone": payload.phone}

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
        # Create a default project
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

# ---------- Projects / Rooms / Devices ----------
@api_router.get("/projects")
async def list_projects(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    return await db.projects.find(q, {"_id": 0}).to_list(500)

@api_router.get("/rooms")
async def list_rooms(project_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if project_id:
        q["project_id"] = project_id
    elif user["role"] == "customer":
        proj = await db.projects.find_one({"user_id": user["id"]}, {"_id": 0})
        if proj:
            q["project_id"] = proj["id"]
    return await db.rooms.find(q, {"_id": 0}).to_list(500)

@api_router.get("/devices")
async def list_devices(room_id: Optional[str] = None, project_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if room_id:
        q["room_id"] = room_id
    if project_id:
        q["project_id"] = project_id
    if not q and user["role"] == "customer":
        proj = await db.projects.find_one({"user_id": user["id"]}, {"_id": 0})
        if proj:
            q["project_id"] = proj["id"]
    return await db.devices.find(q, {"_id": 0}).to_list(1000)

@api_router.post("/devices/{device_id}/command")
async def device_command(device_id: str, cmd: DeviceCommand, user=Depends(get_current_user)):
    device = await db.devices.find_one({"id": device_id}, {"_id": 0})
    if not device:
        raise HTTPException(404, "Device not found")
    new_state = {**device.get("state", {}), **cmd.state}
    await db.devices.update_one({"id": device_id}, {"$set": {"state": new_state, "last_active": now_iso()}})
    log = {
        "id": str(uuid.uuid4()),
        "device_id": device_id,
        "user_id": user["id"],
        "command": cmd.state,
        "timestamp": now_iso(),
    }
    await db.command_logs.insert_one(dict(log))
    await manager.broadcast({"type": "device_update", "device_id": device_id, "state": new_state})
    return {"success": True, "state": new_state}

# ---------- Scenes ----------
@api_router.get("/scenes")
async def list_scenes(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    return await db.scenes.find(q, {"_id": 0}).to_list(200)

@api_router.post("/scenes/{scene_id}/execute")
async def exec_scene(scene_id: str, user=Depends(get_current_user)):
    scene = await db.scenes.find_one({"id": scene_id}, {"_id": 0})
    if not scene:
        raise HTTPException(404, "Scene not found")
    for action in scene.get("actions", []):
        d = await db.devices.find_one({"id": action["device_id"]}, {"_id": 0})
        if d:
            new_state = {**d.get("state", {}), **action.get("state", {})}
            await db.devices.update_one({"id": d["id"]}, {"$set": {"state": new_state, "last_active": now_iso()}})
            await manager.broadcast({"type": "device_update", "device_id": d["id"], "state": new_state})
    return {"success": True, "scene": scene["name"]}

# ---------- Notifications ----------
@api_router.get("/notifications")
async def get_notifications(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    return await db.notifications.find(q, {"_id": 0}).sort("created_at", -1).to_list(100)

@api_router.post("/notifications/{nid}/read")
async def read_notif(nid: str, user=Depends(get_current_user)):
    await db.notifications.update_one({"id": nid}, {"$set": {"read": True}})
    return {"ok": True}

# ---------- Schedules ----------
@api_router.get("/schedules")
async def list_schedules(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    return await db.schedules.find(q, {"_id": 0}).to_list(200)

@api_router.post("/schedules")
async def create_schedule(payload: Dict[str, Any], user=Depends(get_current_user)):
    s = {"id": str(uuid.uuid4()), "user_id": user["id"], "created_at": now_iso(), **payload}
    await db.schedules.insert_one(dict(s))
    s.pop("_id", None)
    return s

@api_router.delete("/schedules/{sid}")
async def del_schedule(sid: str, user=Depends(get_current_user)):
    await db.schedules.delete_one({"id": sid, "user_id": user["id"]})
    return {"ok": True}

# ---------- Energy / Analytics ----------
@api_router.get("/energy/summary")
async def energy_summary(user=Depends(get_current_user)):
    devices = await db.devices.find({} if user["role"] == "admin" else {"project_id": {"$in": [p["id"] async for p in db.projects.find({"user_id": user["id"]}, {"id": 1, "_id": 0})]}}, {"_id": 0}).to_list(500)
    today_kwh = round(sum(d.get("power_w", 0) for d in devices if d.get("state", {}).get("on")) * 0.012, 2)
    week = [{"day": d, "kwh": round(8 + i * 1.5 + (i % 3) * 2.1, 1)} for i, d in enumerate(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"])]
    by_room = {}
    for d in devices:
        rid = d.get("room_id", "other")
        by_room[rid] = by_room.get(rid, 0) + d.get("power_w", 0) * 0.012
    rooms = await db.rooms.find({}, {"_id": 0}).to_list(500)
    rmap = {r["id"]: r["name"] for r in rooms}
    by_room_list = [{"room": rmap.get(k, "Other"), "kwh": round(v, 2)} for k, v in by_room.items()]
    return {"today_kwh": today_kwh, "week": week, "by_room": by_room_list, "savings_pct": 18}

# ---------- Jobs (Technician) ----------
@api_router.get("/jobs")
async def list_jobs(user=Depends(get_current_user)):
    if user["role"] == "technician":
        q = {"technician_id": user["id"]}
    elif user["role"] == "admin":
        q = {}
    else:
        q = {"customer_id": user["id"]}
    return await db.jobs.find(q, {"_id": 0}).sort("scheduled_at", -1).to_list(500)

@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str, user=Depends(get_current_user)):
    j = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    if user["role"] == "technician" and j.get("technician_id") != user["id"]:
        raise HTTPException(403, "Not your job")
    if user["role"] == "customer" and j.get("customer_id") != user["id"]:
        raise HTTPException(403, "Not your job")
    return j

@api_router.patch("/jobs/{job_id}")
async def update_job(job_id: str, payload: Dict[str, Any], user=Depends(get_current_user)):
    if user["role"] not in ("technician", "admin"):
        raise HTTPException(403, "Forbidden")
    j = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not j:
        raise HTTPException(404, "Job not found")
    if user["role"] == "technician" and j.get("technician_id") != user["id"]:
        raise HTTPException(403, "Not your job")
    payload["updated_at"] = now_iso()
    await db.jobs.update_one({"id": job_id}, {"$set": payload})
    return await db.jobs.find_one({"id": job_id}, {"_id": 0})

@api_router.post("/jobs")
async def create_job(payload: Dict[str, Any], user=Depends(require_role("admin"))):
    j = {"id": str(uuid.uuid4()), "status": "scheduled", "checklist": payload.get("checklist", []), "photos": [], "created_at": now_iso(), **payload}
    await db.jobs.insert_one(dict(j))
    j.pop("_id", None)
    return j

# ---------- Tickets / Complaints ----------
@api_router.get("/tickets")
async def list_tickets(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"user_id": user["id"]}
    return await db.tickets.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/tickets")
async def create_ticket(payload: Dict[str, Any], user=Depends(get_current_user)):
    t = {"id": str(uuid.uuid4()), "user_id": user["id"], "user_name": user.get("name"), "status": "open", "priority": payload.get("priority", "medium"), "created_at": now_iso(), **payload}
    await db.tickets.insert_one(dict(t))
    t.pop("_id", None)
    return t

@api_router.patch("/tickets/{tid}")
async def update_ticket(tid: str, payload: Dict[str, Any], user=Depends(get_current_user)):
    t = await db.tickets.find_one({"id": tid}, {"_id": 0})
    if not t:
        raise HTTPException(404, "Ticket not found")
    if user["role"] != "admin" and t.get("user_id") != user["id"]:
        raise HTTPException(403, "Not your ticket")
    await db.tickets.update_one({"id": tid}, {"$set": {**payload, "updated_at": now_iso()}})
    return await db.tickets.find_one({"id": tid}, {"_id": 0})

# ---------- CRM: Leads, Customers, Quotations, Invoices, AMC ----------
async def _crud_get(coll, user, mine_field=None):
    q = {} if user["role"] == "admin" else (({mine_field: user["id"]}) if mine_field else {})
    return await db[coll].find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.get("/leads")
async def get_leads(user=Depends(require_role("admin"))):
    return await _crud_get("leads", user)

@api_router.post("/leads")
async def add_lead(payload: Dict[str, Any], user=Depends(require_role("admin"))):
    l = {"id": str(uuid.uuid4()), "status": "new", "created_at": now_iso(), **payload}
    await db.leads.insert_one(dict(l))
    l.pop("_id", None)
    return l

@api_router.patch("/leads/{lid}")
async def upd_lead(lid: str, payload: Dict[str, Any], user=Depends(require_role("admin"))):
    await db.leads.update_one({"id": lid}, {"$set": payload})
    return await db.leads.find_one({"id": lid}, {"_id": 0})

@api_router.get("/customers")
async def get_customers(user=Depends(require_role("admin"))):
    return await db.users.find({"role": "customer"}, {"_id": 0, "password": 0}).to_list(500)

@api_router.get("/quotations")
async def get_quotations(user=Depends(require_role("admin"))):
    return await db.quotations.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/quotations")
async def add_quotation(payload: Dict[str, Any], user=Depends(require_role("admin"))):
    q = {"id": str(uuid.uuid4()), "number": f"QT-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}", "status": "draft", "created_at": now_iso(), **payload}
    await db.quotations.insert_one(dict(q))
    q.pop("_id", None)
    return q

@api_router.get("/invoices")
async def get_invoices(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"customer_id": user["id"]}
    return await db.invoices.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)

@api_router.post("/invoices")
async def add_invoice(payload: Dict[str, Any], user=Depends(require_role("admin"))):
    inv = {"id": str(uuid.uuid4()), "number": f"INV-{datetime.now().strftime('%Y%m')}-{str(uuid.uuid4())[:4].upper()}", "status": "unpaid", "gst_pct": 18, "created_at": now_iso(), **payload}
    await db.invoices.insert_one(dict(inv))
    inv.pop("_id", None)
    return inv

@api_router.get("/amc")
async def get_amc(user=Depends(get_current_user)):
    q = {} if user["role"] == "admin" else {"customer_id": user["id"]}
    return await db.amc.find(q, {"_id": 0}).to_list(200)

# ---------- Inventory & Products ----------
@api_router.get("/inventory")
async def get_inventory(user=Depends(require_role("admin"))):
    return await db.inventory.find({}, {"_id": 0}).to_list(500)

@api_router.patch("/inventory/{iid}")
async def upd_inventory(iid: str, payload: Dict[str, Any], user=Depends(require_role("admin"))):
    await db.inventory.update_one({"id": iid}, {"$set": payload})
    return await db.inventory.find_one({"id": iid}, {"_id": 0})

@api_router.get("/products")
async def get_products(user=Depends(get_current_user)):
    return await db.products.find({}, {"_id": 0}).to_list(500)

# ---------- Chat ----------
@api_router.get("/chat/messages")
async def get_chat(thread_id: Optional[str] = None, user=Depends(get_current_user)):
    if user["role"] != "admin":
        thread_id = user["id"]
    if not thread_id:
        return []
    return await db.chat_messages.find({"thread_id": thread_id}, {"_id": 0}).sort("created_at", 1).to_list(500)

@api_router.get("/chat/threads")
async def get_threads(user=Depends(require_role("admin"))):
    pipeline = [
        {"$sort": {"created_at": -1}},
        {"$group": {"_id": "$thread_id", "last": {"$first": "$content"}, "name": {"$first": "$user_name"}, "at": {"$first": "$created_at"}}},
    ]
    out = []
    async for r in db.chat_messages.aggregate(pipeline):
        out.append({"thread_id": r["_id"], "last": r["last"], "name": r["name"], "at": r["at"]})
    return out

@api_router.post("/chat/messages")
async def post_chat(payload: Dict[str, Any], user=Depends(get_current_user)):
    thread = payload.get("thread_id") or user["id"]
    msg = {
        "id": str(uuid.uuid4()),
        "thread_id": thread,
        "sender_id": user["id"],
        "sender_role": user["role"],
        "user_name": user.get("name"),
        "content": payload["content"],
        "created_at": now_iso(),
    }
    await db.chat_messages.insert_one(dict(msg))
    msg.pop("_id", None)
    await manager.broadcast({"type": "chat", "message": msg})
    return msg

# ---------- Admin Analytics ----------
@api_router.get("/analytics/overview")
async def analytics_overview(user=Depends(require_role("admin"))):
    customers = await db.users.count_documents({"role": "customer"})
    devices = await db.devices.count_documents({})
    online = await db.devices.count_documents({"online": True})
    open_tickets = await db.tickets.count_documents({"status": "open"})
    invoices = await db.invoices.find({}, {"_id": 0}).to_list(1000)
    revenue = sum((i.get("amount", 0) for i in invoices if i.get("status") == "paid"))
    pending = sum((i.get("amount", 0) for i in invoices if i.get("status") == "unpaid"))
    months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"]
    revenue_trend = [{"month": m, "revenue": int(120000 + i * 25000 + (i % 2) * 18000)} for i, m in enumerate(months)]
    leads_pipeline = []
    for s in ["new", "qualified", "proposal", "won", "lost"]:
        c = await db.leads.count_documents({"status": s})
        leads_pipeline.append({"stage": s, "count": c})
    return {
        "customers": customers,
        "devices": devices,
        "devices_online": online,
        "open_tickets": open_tickets,
        "revenue_paid": revenue,
        "revenue_pending": pending,
        "revenue_trend": revenue_trend,
        "leads_pipeline": leads_pipeline,
    }

# ---------- Stripe Payments ----------
from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest

PACKAGES = {
    "amc_basic": {"amount": 2999.0, "name": "AMC Basic Plan (1 Year)"},
    "amc_premium": {"amount": 5999.0, "name": "AMC Premium Plan (1 Year)"},
    "amc_elite": {"amount": 9999.0, "name": "AMC Elite Plan (1 Year)"},
}

class CheckoutRequest(BaseModel):
    package_id: Optional[str] = None
    invoice_id: Optional[str] = None
    origin_url: str
    metadata: Optional[Dict[str, str]] = None

@api_router.post("/payments/checkout/session")
async def create_checkout(payload: CheckoutRequest, request: Request, user=Depends(get_current_user)):
    if payload.package_id:
        if payload.package_id not in PACKAGES:
            raise HTTPException(400, "Invalid package")
        amount = PACKAGES[payload.package_id]["amount"]
        desc = PACKAGES[payload.package_id]["name"]
    elif payload.invoice_id:
        inv = await db.invoices.find_one({"id": payload.invoice_id}, {"_id": 0})
        if not inv:
            raise HTTPException(404, "Invoice not found")
        amount = float(inv["amount"])
        desc = f"Invoice {inv['number']}"
    else:
        raise HTTPException(400, "package_id or invoice_id required")

    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    webhook_url = f"{host_url}/api/webhook/stripe"
    sc = StripeCheckout(api_key=api_key, webhook_url=webhook_url)

    success_url = f"{payload.origin_url}/billing?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{payload.origin_url}/billing"
    meta = {"user_id": user["id"], "desc": desc, **(payload.metadata or {})}
    if payload.package_id:
        meta["package_id"] = payload.package_id
    if payload.invoice_id:
        meta["invoice_id"] = payload.invoice_id

    req = CheckoutSessionRequest(amount=amount, currency="usd", success_url=success_url, cancel_url=cancel_url, metadata=meta)
    session = await sc.create_checkout_session(req)

    txn = {
        "id": str(uuid.uuid4()),
        "session_id": session.session_id,
        "user_id": user["id"],
        "amount": amount,
        "currency": "usd",
        "metadata": meta,
        "payment_status": "pending",
        "status": "initiated",
        "created_at": now_iso(),
    }
    await db.payment_transactions.insert_one(dict(txn))
    return {"url": session.url, "session_id": session.session_id}

@api_router.get("/payments/checkout/status/{session_id}")
async def checkout_status(session_id: str, request: Request, user=Depends(get_current_user)):
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")

    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    try:
        status_resp = await sc.get_checkout_status(session_id)
    except Exception as e:
        logger.warning(f"Stripe status retrieval failed, using local cache: {e}")
        if txn:
            return {"status": txn.get("status", "pending"), "payment_status": txn.get("payment_status", "pending"), "amount_total": int(float(txn.get("amount", 0)) * 100), "currency": txn.get("currency", "usd")}
        raise HTTPException(404, "Session not found")

    if txn and txn.get("payment_status") != "paid" and status_resp.payment_status == "paid":
        await db.payment_transactions.update_one({"session_id": session_id}, {"$set": {"payment_status": "paid", "status": "completed", "completed_at": now_iso()}})
        # Mark invoice paid if invoice
        meta = txn.get("metadata", {})
        if meta.get("invoice_id"):
            await db.invoices.update_one({"id": meta["invoice_id"]}, {"$set": {"status": "paid", "paid_at": now_iso()}})
        if meta.get("package_id"):
            # Add AMC subscription
            amc = {
                "id": str(uuid.uuid4()),
                "customer_id": txn["user_id"],
                "plan": meta["package_id"],
                "amount": txn["amount"],
                "start_date": now_iso(),
                "end_date": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat(),
                "status": "active",
                "created_at": now_iso(),
            }
            await db.amc.insert_one(dict(amc))

    return {"status": status_resp.status, "payment_status": status_resp.payment_status, "amount_total": status_resp.amount_total, "currency": status_resp.currency}

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    api_key = os.environ.get("STRIPE_API_KEY")
    host_url = str(request.base_url).rstrip("/")
    sc = StripeCheckout(api_key=api_key, webhook_url=f"{host_url}/api/webhook/stripe")
    try:
        evt = await sc.handle_webhook(body, sig)
        if evt.payment_status == "paid":
            await db.payment_transactions.update_one({"session_id": evt.session_id}, {"$set": {"payment_status": "paid", "status": "completed"}})
    except Exception as e:
        logger.error(f"Webhook err: {e}")
    return {"ok": True}

# ---------- WebSocket ----------
@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket):
    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)

# ---------- Healthcheck ----------
@api_router.get("/")
async def root():
    return {"app": "Niva Novus", "version": "1.0", "status": "ok"}

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("nivanovus")

@app.on_event("startup")
async def startup():
    # Auto-seed if empty
    if await db.users.count_documents({}) == 0:
        from seed import seed_all
        await seed_all(db)
        logger.info("Seeded demo data")

@app.on_event("shutdown")
async def shutdown():
    client.close()
