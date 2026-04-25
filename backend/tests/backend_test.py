"""Niva Novus Backend API Tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://automation-nexus-15.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

# Read frontend env if not set
if "REACT_APP_BACKEND_URL" not in os.environ:
    try:
        with open("/app/frontend/.env") as f:
            for ln in f:
                if ln.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = ln.split("=", 1)[1].strip().strip('"').rstrip("/")
                    API = f"{BASE_URL}/api"
    except Exception:
        pass


@pytest.fixture(scope="session")
def s():
    return requests.Session()


@pytest.fixture(scope="session")
def admin_token(s):
    r = s.post(f"{API}/auth/login", json={"email": "admin@nivanovus.com", "password": "admin123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def tech_token(s):
    r = s.post(f"{API}/auth/login", json={"email": "tech@nivanovus.com", "password": "tech123"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="session")
def customer_token(s):
    r = s.post(f"{API}/auth/otp/verify", json={"phone": "+919999900001", "otp": "123456"}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


def H(t):
    return {"Authorization": f"Bearer {t}"}


# ----- Health -----
def test_root(s):
    r = s.get(f"{API}/", timeout=30)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


# ----- Auth -----
def test_otp_send(s):
    r = s.post(f"{API}/auth/otp/send", json={"phone": "+919999900001"}, timeout=30)
    assert r.status_code == 200
    assert r.json().get("success") is True


def test_otp_verify_success(s):
    r = s.post(f"{API}/auth/otp/verify", json={"phone": "+919999900001", "otp": "123456"}, timeout=30)
    assert r.status_code == 200
    j = r.json()
    assert "token" in j and "user" in j
    assert j["user"]["role"] == "customer"


def test_otp_verify_wrong(s):
    r = s.post(f"{API}/auth/otp/verify", json={"phone": "+919999900001", "otp": "000000"}, timeout=30)
    assert r.status_code == 400


def test_login_admin(s, admin_token):
    assert isinstance(admin_token, str) and len(admin_token) > 10


def test_login_tech(s, tech_token):
    assert isinstance(tech_token, str) and len(tech_token) > 10


def test_login_wrong(s):
    r = s.post(f"{API}/auth/login", json={"email": "admin@nivanovus.com", "password": "wrong"}, timeout=30)
    assert r.status_code == 401


def test_auth_me(s, customer_token):
    r = s.get(f"{API}/auth/me", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    assert r.json().get("role") == "customer"


# ----- Devices/Rooms/Scenes -----
def test_devices_customer(s, customer_token):
    r = s.get(f"{API}/devices", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    devs = r.json()
    assert isinstance(devs, list)
    assert len(devs) >= 18, f"Expected >=18 devices got {len(devs)}"


def test_rooms_customer(s, customer_token):
    r = s.get(f"{API}/rooms", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    assert len(r.json()) >= 5


def test_scenes(s, customer_token):
    r = s.get(f"{API}/scenes", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    assert len(r.json()) >= 4


def test_device_command(s, customer_token):
    devs = s.get(f"{API}/devices", headers=H(customer_token), timeout=30).json()
    did = devs[0]["id"]
    r = s.post(f"{API}/devices/{did}/command", headers=H(customer_token), json={"state": {"on": False}}, timeout=30)
    assert r.status_code == 200
    assert r.json()["state"].get("on") is False


def test_scene_execute(s, customer_token):
    scenes = s.get(f"{API}/scenes", headers=H(customer_token), timeout=30).json()
    sid = scenes[0]["id"]
    r = s.post(f"{API}/scenes/{sid}/execute", headers=H(customer_token), json={}, timeout=30)
    assert r.status_code == 200
    assert r.json()["success"] is True


def test_notifications(s, customer_token):
    r = s.get(f"{API}/notifications", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


# ----- Jobs -----
def test_jobs_tech(s, tech_token):
    r = s.get(f"{API}/jobs", headers=H(tech_token), timeout=30)
    assert r.status_code == 200
    jobs = r.json()
    assert len(jobs) >= 3


def test_job_detail_and_patch(s, tech_token):
    jobs = s.get(f"{API}/jobs", headers=H(tech_token), timeout=30).json()
    jid = jobs[0]["id"]
    r = s.get(f"{API}/jobs/{jid}", headers=H(tech_token), timeout=30)
    assert r.status_code == 200
    assert "checklist" in r.json()
    r2 = s.patch(f"{API}/jobs/{jid}", headers=H(tech_token), json={"status": "in_progress"}, timeout=30)
    assert r2.status_code == 200
    assert r2.json().get("status") == "in_progress"


# ----- Tickets -----
def test_tickets_customer_list(s, customer_token):
    r = s.get(f"{API}/tickets", headers=H(customer_token), timeout=30)
    assert r.status_code == 200


def test_create_ticket(s, customer_token):
    r = s.post(f"{API}/tickets", headers=H(customer_token), json={"title": "TEST_t", "description": "x", "priority": "high"}, timeout=30)
    assert r.status_code == 200
    tid = r.json()["id"]
    assert r.json()["status"] == "open"
    return tid


def test_patch_ticket_admin(s, admin_token, customer_token):
    cr = s.post(f"{API}/tickets", headers=H(customer_token), json={"title": "TEST_p", "description": "y"}, timeout=30)
    tid = cr.json()["id"]
    r = s.patch(f"{API}/tickets/{tid}", headers=H(admin_token), json={"status": "resolved"}, timeout=30)
    assert r.status_code == 200
    assert r.json().get("status") == "resolved"


# ----- Admin RBAC -----
def test_leads_admin(s, admin_token):
    r = s.get(f"{API}/leads", headers=H(admin_token), timeout=30)
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_leads_customer_403(s, customer_token):
    r = s.get(f"{API}/leads", headers=H(customer_token), timeout=30)
    assert r.status_code == 403


def test_customers_admin(s, admin_token):
    r = s.get(f"{API}/customers", headers=H(admin_token), timeout=30)
    assert r.status_code == 200


def test_customers_customer_403(s, customer_token):
    r = s.get(f"{API}/customers", headers=H(customer_token), timeout=30)
    assert r.status_code == 403


def test_inventory_admin(s, admin_token):
    r = s.get(f"{API}/inventory", headers=H(admin_token), timeout=30)
    assert r.status_code == 200


def test_inventory_customer_403(s, customer_token):
    r = s.get(f"{API}/inventory", headers=H(customer_token), timeout=30)
    assert r.status_code == 403


def test_invoices(s, customer_token):
    r = s.get(f"{API}/invoices", headers=H(customer_token), timeout=30)
    assert r.status_code == 200


def test_amc(s, customer_token):
    r = s.get(f"{API}/amc", headers=H(customer_token), timeout=30)
    assert r.status_code == 200


def test_analytics_overview(s, admin_token):
    r = s.get(f"{API}/analytics/overview", headers=H(admin_token), timeout=30)
    assert r.status_code == 200
    j = r.json()
    for k in ["customers", "devices", "revenue_trend", "leads_pipeline"]:
        assert k in j


def test_energy_summary(s, customer_token):
    r = s.get(f"{API}/energy/summary", headers=H(customer_token), timeout=30)
    assert r.status_code == 200
    for k in ["today_kwh", "week", "by_room"]:
        assert k in r.json()


# ----- Payments -----
def test_checkout_session(s, customer_token):
    r = s.post(f"{API}/payments/checkout/session", headers=H(customer_token),
               json={"package_id": "amc_premium", "origin_url": "https://example.com"}, timeout=60)
    assert r.status_code == 200, r.text
    j = r.json()
    assert "url" in j and "session_id" in j
    assert "stripe.com" in j["url"]
    return j["session_id"]


def test_checkout_status(s, customer_token):
    r = s.post(f"{API}/payments/checkout/session", headers=H(customer_token),
               json={"package_id": "amc_basic", "origin_url": "https://example.com"}, timeout=60)
    sid = r.json()["session_id"]
    r2 = s.get(f"{API}/payments/checkout/status/{sid}", headers=H(customer_token), timeout=60)
    assert r2.status_code == 200
    assert "payment_status" in r2.json()


# ----- Chat -----
def test_chat_threads_admin(s, admin_token):
    r = s.get(f"{API}/chat/threads", headers=H(admin_token), timeout=30)
    assert r.status_code == 200


def test_chat_post(s, customer_token):
    r = s.post(f"{API}/chat/messages", headers=H(customer_token), json={"content": "TEST_msg"}, timeout=30)
    assert r.status_code == 200
    assert r.json()["content"] == "TEST_msg"
