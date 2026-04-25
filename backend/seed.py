"""Niva Novus seed data."""
import uuid
import bcrypt
from datetime import datetime, timezone, timedelta


def now_iso():
    return datetime.now(timezone.utc).isoformat()


def hp(pw):
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


async def seed_all(db):
    # Users
    admin_id = str(uuid.uuid4())
    tech_id = str(uuid.uuid4())
    cust_id = str(uuid.uuid4())

    await db.users.insert_many([
        {"id": admin_id, "name": "Aarav Mehta", "email": "admin@nivanovus.com", "phone": "+919999900000", "password": hp("admin123"), "role": "admin", "created_at": now_iso()},
        {"id": tech_id, "name": "Rohan Singh", "email": "tech@nivanovus.com", "phone": "+919999900002", "password": hp("tech123"), "role": "technician", "created_at": now_iso()},
        {"id": cust_id, "name": "Priya Iyer", "email": "customer@nivanovus.com", "phone": "+919999900001", "password": hp("customer123"), "role": "customer", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Vikram Rao", "email": "vikram@example.com", "phone": "+919811111222", "password": "", "role": "customer", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Neha Kapoor", "email": "neha@example.com", "phone": "+919811111223", "password": "", "role": "customer", "created_at": now_iso()},
    ])

    # Project for customer
    proj_id = str(uuid.uuid4())
    await db.projects.insert_one({
        "id": proj_id, "user_id": cust_id, "name": "The Iyer Residence",
        "address": "12B, Sea View Apartments, Marine Drive, Mumbai 400020",
        "lat": 18.9430, "lng": 72.8231, "created_at": now_iso(),
    })

    # Rooms
    rooms = [
        {"id": str(uuid.uuid4()), "project_id": proj_id, "name": "Living Room", "icon": "sofa"},
        {"id": str(uuid.uuid4()), "project_id": proj_id, "name": "Master Bedroom", "icon": "bed"},
        {"id": str(uuid.uuid4()), "project_id": proj_id, "name": "Kitchen", "icon": "utensils"},
        {"id": str(uuid.uuid4()), "project_id": proj_id, "name": "Kids Room", "icon": "baby"},
        {"id": str(uuid.uuid4()), "project_id": proj_id, "name": "Entrance", "icon": "door"},
    ]
    await db.rooms.insert_many([dict(r) for r in rooms])

    # Devices
    def dev(name, type_, room_id, state, power=20, online=True):
        return {
            "id": str(uuid.uuid4()), "project_id": proj_id, "room_id": room_id,
            "name": name, "type": type_, "state": state, "power_w": power,
            "online": online, "last_active": now_iso(),
            "firmware": "v2.4.1", "vendor": "Tuya", "protocol": "wifi",
        }

    living = rooms[0]["id"]; bed = rooms[1]["id"]; kitchen = rooms[2]["id"]; kids = rooms[3]["id"]; entrance = rooms[4]["id"]
    devices = [
        dev("Ambient Lights", "light", living, {"on": True, "brightness": 70, "color": "#F3E5AB"}, 35),
        dev("Ceiling Fan", "fan", living, {"on": True, "speed": 3}, 70),
        dev("Smart TV Plug", "plug", living, {"on": False}, 0, True),
        dev("Window Curtain", "curtain", living, {"position": 60}, 25),
        dev("Living AC", "ac", living, {"on": True, "temp": 24, "mode": "cool"}, 1500),
        dev("Bed Reading Light", "light", bed, {"on": False, "brightness": 30}, 0),
        dev("Master AC", "ac", bed, {"on": False, "temp": 22, "mode": "cool"}, 0),
        dev("Bedside Plug", "plug", bed, {"on": True}, 12),
        dev("Geyser", "geyser", bed, {"on": False, "temp": 55}, 0, True),
        dev("Kitchen Lights", "light", kitchen, {"on": True, "brightness": 100}, 40),
        dev("Smoke Sensor", "smoke", kitchen, {"alert": False}, 1),
        dev("Gas Detector", "gas", kitchen, {"alert": False}, 1),
        dev("Kids Room Light", "light", kids, {"on": False, "brightness": 50}, 0),
        dev("Kids AC", "ac", kids, {"on": False, "temp": 24, "mode": "cool"}, 0),
        dev("Front Door Lock", "lock", entrance, {"locked": True}, 5),
        dev("Doorbell Camera", "doorbell", entrance, {"on": True, "motion": False}, 8),
        dev("CCTV - Hallway", "cctv", entrance, {"on": True, "recording": True}, 10),
        dev("Entry Light", "light", entrance, {"on": True, "brightness": 80}, 18),
    ]
    await db.devices.insert_many([dict(d) for d in devices])

    # Scenes
    living_lights = devices[0]["id"]; ceiling_fan = devices[1]["id"]; living_ac = devices[4]["id"]
    bed_light = devices[5]["id"]; entry_light = devices[17]["id"]
    scenes = [
        {"id": str(uuid.uuid4()), "user_id": cust_id, "name": "Good Morning", "icon": "sun", "actions": [
            {"device_id": living_lights, "state": {"on": True, "brightness": 80}},
            {"device_id": entry_light, "state": {"on": False}},
            {"device_id": ceiling_fan, "state": {"on": True, "speed": 2}},
        ]},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "name": "Movie Mode", "icon": "film", "actions": [
            {"device_id": living_lights, "state": {"on": True, "brightness": 20}},
            {"device_id": living_ac, "state": {"on": True, "temp": 22}},
        ]},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "name": "Sleep Mode", "icon": "moon", "actions": [
            {"device_id": living_lights, "state": {"on": False}},
            {"device_id": ceiling_fan, "state": {"on": False}},
            {"device_id": bed_light, "state": {"on": True, "brightness": 15}},
        ]},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "name": "Away Mode", "icon": "shield", "actions": [
            {"device_id": living_lights, "state": {"on": False}},
            {"device_id": ceiling_fan, "state": {"on": False}},
            {"device_id": living_ac, "state": {"on": False}},
            {"device_id": entry_light, "state": {"on": True, "brightness": 60}},
        ]},
    ]
    await db.scenes.insert_many([dict(s) for s in scenes])

    # Notifications
    notifs = [
        {"id": str(uuid.uuid4()), "user_id": cust_id, "type": "doorbell", "title": "Doorbell Rang", "body": "Front door doorbell pressed", "read": False, "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "type": "motion", "title": "Motion Detected", "body": "Hallway camera detected motion", "read": False, "created_at": (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "type": "energy", "title": "Energy Tip", "body": "You saved 12% energy this week!", "read": True, "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "type": "amc", "title": "AMC Renewal", "body": "Your AMC plan expires in 30 days", "read": False, "created_at": (datetime.now(timezone.utc) - timedelta(hours=5)).isoformat()},
    ]
    await db.notifications.insert_many([dict(n) for n in notifs])

    # Jobs
    jobs = [
        {"id": str(uuid.uuid4()), "technician_id": tech_id, "customer_id": cust_id, "customer_name": "Priya Iyer",
         "address": "12B, Sea View Apartments, Marine Drive, Mumbai", "phone": "+919999900001",
         "lat": 18.9430, "lng": 72.8231, "type": "Installation", "status": "scheduled",
         "scheduled_at": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
         "checklist": [
            {"id": "1", "label": "Verify customer details & site readiness", "done": False},
            {"id": "2", "label": "Install smart switches", "done": False},
            {"id": "3", "label": "Pair all IoT devices to gateway", "done": False},
            {"id": "4", "label": "Configure WiFi credentials", "done": False},
            {"id": "5", "label": "Test all switches & sensors", "done": False},
            {"id": "6", "label": "Customer training & demo", "done": False},
            {"id": "7", "label": "Capture customer signature", "done": False},
         ], "photos": [], "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "technician_id": tech_id, "customer_id": cust_id, "customer_name": "Vikram Rao",
         "address": "Tower 4, Lodha Park, Worli, Mumbai", "phone": "+919811111222",
         "lat": 19.0167, "lng": 72.8167, "type": "Service Visit", "status": "in_progress",
         "scheduled_at": now_iso(),
         "checklist": [
            {"id": "1", "label": "Diagnose offline devices", "done": True},
            {"id": "2", "label": "Replace faulty relay", "done": True},
            {"id": "3", "label": "Test all functions", "done": False},
         ], "photos": [], "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "technician_id": tech_id, "customer_id": cust_id, "customer_name": "Neha Kapoor",
         "address": "Villa 22, Hiranandani Estate, Thane", "phone": "+919811111223",
         "lat": 19.2000, "lng": 72.9500, "type": "Installation", "status": "completed",
         "scheduled_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
         "checklist": [{"id": "1", "label": "All complete", "done": True}],
         "photos": [], "completed_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
         "created_at": (datetime.now(timezone.utc) - timedelta(days=4)).isoformat()},
    ]
    await db.jobs.insert_many([dict(j) for j in jobs])

    # Tickets
    tickets = [
        {"id": str(uuid.uuid4()), "user_id": cust_id, "user_name": "Priya Iyer", "subject": "Living AC not responding", "description": "AC turns off randomly after 10 mins", "status": "open", "priority": "high", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "user_name": "Vikram Rao", "subject": "Doorbell delay", "description": "Notification arrives 30s late", "status": "in_progress", "priority": "medium", "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()},
        {"id": str(uuid.uuid4()), "user_id": cust_id, "user_name": "Neha Kapoor", "subject": "App crash on iOS", "description": "Crashes on opening Energy tab", "status": "resolved", "priority": "low", "created_at": (datetime.now(timezone.utc) - timedelta(days=5)).isoformat()},
    ]
    await db.tickets.insert_many([dict(t) for t in tickets])

    # Leads
    leads = [
        {"id": str(uuid.uuid4()), "name": "Ramesh Khanna", "phone": "+919811000001", "email": "ramesh@example.com", "source": "Website", "interest": "Full Home Automation - 4BHK", "value": 450000, "status": "qualified", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Sneha Joshi", "phone": "+919811000002", "email": "sneha@example.com", "source": "Referral", "interest": "Smart Lighting + AC", "value": 180000, "status": "proposal", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Anil Bhatia", "phone": "+919811000003", "email": "anil@example.com", "source": "Instagram Ads", "interest": "Security Pack", "value": 95000, "status": "new", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Kavita Reddy", "phone": "+919811000004", "email": "kavita@example.com", "source": "Walk-in", "interest": "Premium Penthouse Setup", "value": 850000, "status": "won", "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "name": "Sahil Gupta", "phone": "+919811000005", "email": "sahil@example.com", "source": "Google Ads", "interest": "Voice + Alexa setup", "value": 65000, "status": "lost", "created_at": now_iso()},
    ]
    await db.leads.insert_many([dict(l) for l in leads])

    # Quotations
    quotations = [
        {"id": str(uuid.uuid4()), "number": "QT-202602-A1B2", "customer_name": "Ramesh Khanna", "items": [{"name": "Smart Switch 4-gang", "qty": 8, "price": 4500}, {"name": "Gateway Hub", "qty": 1, "price": 12000}], "subtotal": 48000, "gst": 8640, "total": 56640, "status": "sent", "created_at": now_iso()},
    ]
    await db.quotations.insert_many([dict(q) for q in quotations])

    # Invoices
    invoices = [
        {"id": str(uuid.uuid4()), "number": "INV-202602-X9Y8", "customer_id": cust_id, "customer_name": "Priya Iyer", "amount": 5999, "gst_pct": 18, "description": "AMC Premium Plan 2026", "status": "unpaid", "due_date": (datetime.now(timezone.utc) + timedelta(days=15)).isoformat(), "created_at": now_iso()},
        {"id": str(uuid.uuid4()), "number": "INV-202601-K3L4", "customer_id": cust_id, "customer_name": "Priya Iyer", "amount": 124000, "gst_pct": 18, "description": "Full Home Automation Package", "status": "paid", "paid_at": (datetime.now(timezone.utc) - timedelta(days=20)).isoformat(), "created_at": (datetime.now(timezone.utc) - timedelta(days=25)).isoformat()},
    ]
    await db.invoices.insert_many([dict(i) for i in invoices])

    # AMC
    await db.amc.insert_one({"id": str(uuid.uuid4()), "customer_id": cust_id, "plan": "amc_premium", "amount": 5999, "start_date": (datetime.now(timezone.utc) - timedelta(days=335)).isoformat(), "end_date": (datetime.now(timezone.utc) + timedelta(days=30)).isoformat(), "status": "active", "created_at": now_iso()})

    # Inventory
    inv_items = [
        {"id": str(uuid.uuid4()), "sku": "NV-SW-4G", "name": "4-Gang Smart Switch", "stock": 45, "price": 4500, "min_stock": 20, "category": "Switches"},
        {"id": str(uuid.uuid4()), "sku": "NV-SW-2G", "name": "2-Gang Smart Switch", "stock": 12, "price": 2800, "min_stock": 25, "category": "Switches"},
        {"id": str(uuid.uuid4()), "sku": "NV-HUB", "name": "Niva Gateway Hub Pro", "stock": 28, "price": 12000, "min_stock": 10, "category": "Hubs"},
        {"id": str(uuid.uuid4()), "sku": "NV-CAM-DB", "name": "Doorbell Camera 2K", "stock": 8, "price": 8500, "min_stock": 15, "category": "Security"},
        {"id": str(uuid.uuid4()), "sku": "NV-LOCK", "name": "Smart Door Lock Pro", "stock": 19, "price": 18500, "min_stock": 10, "category": "Security"},
        {"id": str(uuid.uuid4()), "sku": "NV-SEN-GAS", "name": "Gas Leak Sensor", "stock": 32, "price": 1900, "min_stock": 20, "category": "Sensors"},
    ]
    await db.inventory.insert_many([dict(i) for i in inv_items])

    # Products
    products = [
        {"id": str(uuid.uuid4()), "name": "Niva Starter Pack", "price": 24999, "description": "Hub + 2 switches + 1 sensor", "image": "https://images.pexels.com/photos/12306417/pexels-photo-12306417.jpeg"},
        {"id": str(uuid.uuid4()), "name": "Niva Premium Suite", "price": 89999, "description": "Full home, all rooms covered", "image": "https://images.pexels.com/photos/13722886/pexels-photo-13722886.jpeg"},
        {"id": str(uuid.uuid4()), "name": "Niva Security Pack", "price": 54999, "description": "Cameras + locks + sensors", "image": "https://images.unsplash.com/photo-1774437290569-4c7061cae2c9"},
    ]
    await db.products.insert_many([dict(p) for p in products])

    # Sample chat
    await db.chat_messages.insert_one({"id": str(uuid.uuid4()), "thread_id": cust_id, "sender_id": cust_id, "sender_role": "customer", "user_name": "Priya Iyer", "content": "Hi, my AC keeps switching off. Can you help?", "created_at": now_iso()})
