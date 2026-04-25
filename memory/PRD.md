# Niva Novus — Smart Home Automation Platform (PRD)

## Original Problem Statement
Build a complete full-stack smart home automation company platform named "Niva Novus" — a production-ready SaaS demo with three role-based experiences (Customer mobile PWA, Technician installer panel, Admin web dashboard), IoT device cloud architecture, business modules (AMC, payments, GST invoicing, leads, inventory) and luxury UI.

## Architecture
- **Backend**: FastAPI + MongoDB (motor async). JWT auth (HS256). Mock OTP for customers. Stripe via `emergentintegrations`. WebSocket `/api/ws` for live device updates. All routes under `/api/*`.
- **Frontend**: React 19 + React Router 7 + Tailwind + Shadcn/UI + Recharts + Lucide. Single SPA with role-based routing (`/app` customer, `/tech` technician, `/admin` admin).
- **Design**: Midnight Blue `#050A1F` + Champagne Gold `#D4AF37`. Playfair Display (serif) + Outfit (sans). Glass-morphism, inner glows, no purple gradients.

## User Personas
1. **Homeowner (Customer)** — controls home via mobile-first PWA, manages bills, books service.
2. **Field Technician** — installs/services devices, runs checklists, uploads photos, captures customer signature.
3. **Company Staff (Admin)** — runs CRM, monitors devices, manages tickets/inventory/finances.

## Core Requirements (Static)
- Three role-based portals with shared backend.
- IoT device CRUD + control (lights, fans, AC, curtains, geyser, plug, CCTV, lock, doorbell, smoke/gas sensors).
- Automation scenes (Good Morning, Movie, Sleep, Away).
- Power consumption analytics + room/day breakdown.
- Notifications (doorbell, motion, energy, AMC).
- Technician job management (checklist, map, photos, signature, report).
- Admin CRM (leads pipeline, customers, quotations, invoices with GST, AMC, inventory, products).
- Live device monitor (auto-refresh).
- Live support chat (admin ↔ customer threads).
- Stripe payment for AMC + invoices, with status polling.

## What's Been Implemented (Feb 2026)
**Backend** (`/app/backend/server.py`)
- Auth: JWT, mock OTP (`123456`), email/password login.
- Devices, rooms, projects, scenes (with execute), schedules.
- Notifications, energy summary, jobs (with role-scoped guards), tickets (owner/admin only PATCH).
- Admin: leads, customers, quotations, invoices, AMC, inventory, products, analytics overview, chat threads.
- Payments: Stripe checkout session, status polling (with DB fallback), webhook handler.
- WebSocket `/api/ws` for broadcasting device updates.
- Auto-seed on first startup (3 users, 1 home, 5 rooms, 18 devices, 4 scenes, 3 jobs, 5 leads, 2 invoices, 6 inventory items, etc.).

**Frontend**
- `Landing.js` — luxury hero with serif "Niva", capabilities grid.
- `Login.js` — three-tab portal (Customer OTP / Tech / Admin).
- `Customer.js` — Bottom-tab PWA: Dashboard (rooms+devices), Scenes, Energy charts, Alerts, Profile, Billing (AMC + invoices), Service.
- `Technician.js` — Job list, Job detail with map, checklist, photos, signature, service report.
- `Admin.js` — Sidebar dashboard: Overview KPIs + charts, Leads, Customers, Devices live monitor, Tickets, Inventory, Invoices, Live Support chat.

## Demo Credentials (also in `/app/memory/test_credentials.md`)
- **Admin**: `admin@nivanovus.com` / `admin123`
- **Technician**: `tech@nivanovus.com` / `tech123`
- **Customer (OTP)**: phone `+919999900001`, OTP `123456`
- **Customer (Email)**: `customer@nivanovus.com` / `customer123`

## Test Status
- Backend: **33/33 tests passing** (after Stripe status fallback fix).
- Frontend: visual smoke check passed.

## Prioritized Backlog
**P1 (next iteration)**
- Real-time WebSocket connection on customer/admin frontends (today devices update via API only).
- Schedules UI on customer (backend ready).
- Quotation generator with PDF export.
- Firmware update workflow.
- Customer signature canvas (currently text input).
- Photo upload to object storage (currently uses placeholder URLs).

**P2**
- Real Twilio SMS OTP.
- Real WhatsApp/SMS alert engine.
- Alexa/Google Home OAuth integration (currently a UI toggle).
- MQTT broker (today simulated via DB writes).
- Referral rewards tracker.
- Customer reviews module.
- Role-based admin staff sub-roles (currently single admin).

## Next Tasks
1. Wire WebSocket subscriber on frontend for live device + chat updates.
2. Add quotation builder UI with PDF download.
3. Implement schedule create/list/delete UI.
4. Object storage for photo uploads in Tech app.
