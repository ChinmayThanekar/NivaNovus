"""Niva Novus - Smart Home Automation Platform Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, status
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

mongo_url = os.environ["MONGO_URL"]
JWT_SECRET = os.environ["JWT_SECRET"]
FRONTEND_URL = os.environ["FRONTEND_URL"]
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

# ---------- Projects ----------
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

# ---------- Energy ----------
@api_router.get("/energy/summary")
async def energy_summary(user=Depends(get_current_user)):
    if user["role"] == "admin":
        device_filter = {}
    else:
        project_ids = [p["id"] async for p in db.projects.find({"user_id": user["id"]}, {"id": 1, "_id": 0})]
        device_filter = {"project_id": {"$in": project_ids}}

    devices = await db.devices.find(device_filter, {"_id": 0}).to_list(500)
    today_kwh = round(sum(d.get("power_w", 0) for d in devices if d.get("state", {}).get("on")) * 0.012, 2)

    week = [{"day": d, "kwh": round(8 + i * 1.5 + (i % 3) * 2.1, 1)} for i, d in enumerate(["Mon","Tue","Wed","Thu","Fri","Sat","Sun"])]

    by_room = {}
    for d in devices:
        rid = d.get("room_id", "other")
        by_room[rid] = by_room.get(rid, 0) + d.get("power_w", 0) * 0.012

    rooms = await db.rooms.find({}, {"_id": 0}).to_list(500)
    rmap = {r["id"]: r["name"] for r in rooms}
    by_room_list = [{"room": rmap.get(k, "Other"), "kwh": round(v, 2)} for k, v in by_room.items()]

    return {"today_kwh": today_kwh, "week": week, "by_room": by_room_list, "savings_pct": 18}

# ---------- Remaining modules unchanged ----------
# Jobs
# Tickets
# CRM
# Inventory
# Chat
# Analytics

# (Keep all your original endpoints exactly same from your old file here —
# only Stripe block has been removed.)

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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        FRONTEND_URL
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("nivanovus")

@app.on_event("startup")
async def startup():
    if await db.users.count_documents({}) == 0:
        from seed import seed_all
        await seed_all(db)
        logger.info("Seeded demo data")

@app.on_event("shutdown")
async def shutdown():
    client.close()
