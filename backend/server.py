"""Niva Novus - Smart Home Automation Platform Backend."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
FRONTEND_URL = os.environ["FRONTEND_URL"]

client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

JWT_SECRET = os.environ.get("JWT_SECRET", "niva-secret")
JWT_ALGO = "HS256"

app = FastAPI(title="Niva Novus API")
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("nivanovus")


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
    payload = {
        "uid": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=30),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


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
