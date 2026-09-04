# e-Office Saraban Manager

ระบบจัดการสารบรรณ e-Office อัตโนมัติของ NT PLC  
Full-stack: **Next.js 15 (React 19 + Tailwind)** (frontend) + **FastAPI (Python 3.12)** (backend)

---

## ⚡ TL;DR — Quick Start (60 วินาที)

```bash
# 1. clone + เตรียม env
git clone https://github.com/athiyawat/eoffice-hub.git && cd eoffice-hub
cp .env.example .env

# แก้ไขค่าใน .env (OPENCLAW_PG_URL และสร้าง FERNET_KEY)
# FERNET_KEY gen ผ่าน python:
# python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# 2. รันทั้งระบบด้วย Docker Compose (เร็วสุด)
docker compose up --build

# เข้าใช้งาน:
# - Frontend: http://localhost:3000
# - Backend API Docs: http://localhost:8000/docs
```

> ต้องการ run แบบ native (hot-reload สำหรับพัฒนา) → ดูหัวข้อ **โหมด A — Native Dev**

---

## 🏛️ Architecture

```mermaid
flowchart LR
    User([👤 เจ้าหน้าที่/ผู้ใช้]) --> FE[Next.js 15 App Router<br/>:3000]
    FE -->|REST /api| BE[FastAPI + APScheduler<br/>:8000]
    BE --> DB[(PostgreSQL Memory<br/>:35432)]
    BE -.->|REST Poll/Accept| EOFFICE[e-Office NT PLC<br/>bucket 390]
    BE -.->|Notification| TG[Telegram Bot]
    BE -.->|Summarize| AI[OpenClaw AI Gateway]
```

**Flow ย่อ:**  
ผู้ใช้เข้าหน้าเว็บตรวจสอบหรือตั้ง Schedule ผ่านระบบ → APScheduler กวาดเอกสารจาก e-Office ตามรอบ (หรือกดกวาดทันที) → ถอดรหัส Token ดึงข้อมูล → AI สรุปสาระสำคัญ 5 มิติ → บันทึกสถานะลง DB → แจ้งเตือนผ่าน Telegram

---

## 🗂️ Project Structure

```
20260904_eoffice-saraban-manager/
├── docker-compose.yml       ← Multi-container orchestration (api, web)
├── .env.example             ← Template ตัวแปรสภาพแวดล้อม
├── README.md                ← เอกสารคู่มือระบบ
├── backend/                 ← FastAPI Python 3.12 (uv)
│   ├── Dockerfile
│   ├── pyproject.toml       ← Python dependencies & metadata
│   ├── alembic.ini          ← Alembic configuration
│   ├── alembic/             ← Database migration scripts
│   └── app/
│       ├── main.py          ← App entrypoint, CORS, lifespan scheduler
│       ├── config.py        ← Pydantic-settings โหลดค่าจาก .env
│       ├── db.py            ← SQLAlchemy async engine & session pool
│       ├── models/          ← SQLAlchemy ORM Models (app_config, schedules, run_logs)
│       ├── schemas/         ← Pydantic v2 validation schemas
│       ├── routers/         ← Thin HTTP handlers (documents, sweep, schedule, config, etc.)
│       └── services/        ← Business logic (eoffice_client, ai_summarizer, telegram, crypto)
└── frontend/                ← Next.js 15 (React 19, Tailwind, TanStack Query)
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/             ← Next.js App Router (dashboard, documents, schedule, settings, logs)
        ├── components/      ← Shared UI Components & Saraban tables
        └── lib/             ← Axios API client, query providers, helpers
```

> **Layering Logic:**  
> `routers/` (รับ HTTP request/response) → ส่งต่อให้ `services/` (แกนหลักของ logic เช่น กวาดเอกสาร/ยิง Telegram/AI) → เชื่อมต่อข้อมูลผ่าน `models/` (SQLAlchemy) และตรวจความถูกต้องด้วย `schemas/` (Pydantic). แก้ไข business flow ที่ `services/` เป็นหลัก

---

## 📦 Prerequisites

| เครื่องมือ | Version | macOS | Windows | verify |
|-----------|---------|-------|---------|--------|
| **Python** | 3.12+ | `brew install python@3.12` | `winget install Python.Python.3.12` | `python3 --version` |
| **uv** | latest | `brew install uv` | `winget install astral-sh.uv` | `uv --version` |
| **Node.js** | 22 LTS | `brew install node@22` | `winget install OpenJS.NodeJS.LTS` | `node -v` |
| **Git** | latest | `brew install git` | `winget install Git.Git` | `git --version` |
| **Docker** (โหมด B) | latest | Docker Desktop | Docker Desktop + WSL2 | `docker --version` |

> 💡 **uv** คือ Python package manager สมัยใหม่ (เขียนด้วย Rust) เร็วกว่า pip 10-100 เท่า จัดการ venv และ install deps ได้รวดเร็ว  
> ติดตั้งแบบ standalone:
> ```bash
> # macOS / Linux
> curl -LsSf https://astral.sh/uv/install.sh | sh
> ```
> ```powershell
> # Windows (PowerShell)
> powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
> ```

---

## 🔧 Setup ครั้งแรก

```bash
# 1. clone repo
git clone https://github.com/athiyawat/eoffice-hub.git
cd eoffice-hub

# 2. สร้าง .env จาก template
cp .env.example .env      # macOS / Linux
copy .env.example .env    # Windows (cmd)
```

สร้าง `FERNET_KEY` สำหรับเข้ารหัสข้อมูล credential:
```bash
uv run --with cryptography python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
นำ key ที่ได้ไปใส่ใน `FERNET_KEY` ในไฟล์ `.env`

---

## 🌱 Environment Variables

| Variable | Required | Default | คำอธิบาย |
|----------|:--------:|---------|----------|
| `OPENCLAW_PG_URL` | ✅ | — | Connection string ไปยัง PostgreSQL เช่น `postgresql://user:pass@host:port/db` |
| `FERNET_KEY` | ✅ | — | คีย์ Symmetric encryption สำหรับเข้ารหัส Token/Secret ใน DB |
| `API_PORT` | ⬜ | `8000` | Port ของ FastAPI backend |
| `API_HOST` | ⬜ | `0.0.0.0` | Host bind สำหรับ backend |
| `CORS_ORIGINS` | ⬜ | `http://localhost:3000,http://web:3000` | Allowed origins สำหรับ CORS |
| `NEXT_PUBLIC_API_URL`| ✅ | `http://localhost:8000` | URL ฝั่ง Client สำหรับยิงหา FastAPI |
| `EOFFICE_TOKEN` | ⬜ | — | Override token e-Office (แนะนำตั้งค่าผ่าน Settings UI) |
| `EOFFICE_BASE_URL` | ⬜ | `https://eoffice.ntplc.co.th` | URL endpoint e-Office |
| `EOFFICE_BUCKET_ID`| ⬜ | `390` | Bucket ID เอกสารสารบรรณ |
| `TELEGRAM_BOT_TOKEN`| ⬜ | — | Override bot token (แนะนำตั้งค่าผ่าน Settings UI) |
| `TELEGRAM_CHAT_ID` | ⬜ | — | Override chat target (แนะนำตั้งค่าผ่าน Settings UI) |
| `OPENCLAW_API_BASE`| ⬜ | `http://openclaw:3000` | Base URL สำหรับ AI Gateway สรุปเนื้อหา |

---

## 🛠️ โหมดการรันพัฒนา (Development)

### โหมด A — Native Dev (แนะนำสำหรับพัฒนา)

รัน **2 terminal พร้อมกัน**: Terminal 1 สำหรับ Backend, Terminal 2 สำหรับ Frontend

#### 🐍 Backend (FastAPI + uv)

<table>
<tr><th>macOS / Linux</th><th>Windows (PowerShell)</th></tr>
<tr valign="top"><td>

```bash
cd backend

# สร้าง venv + install deps (dev extras)
uv venv
source .venv/bin/activate
uv pip install -e ".[dev]"

# รัน migration
alembic upgrade head

# start dev server (hot-reload)
uvicorn app.main:app --reload --port 8000
```

</td><td>

```powershell
cd backend

# สร้าง venv + install deps (dev extras)
uv venv
.venv\Scripts\Activate.ps1
uv pip install -e ".[dev]"

# รัน migration
alembic upgrade head

# start dev server (hot-reload)
uvicorn app.main:app --reload --port 8000
```

</td></tr>
</table>

> ⚡ **ทางลัด** — ไม่ต้อง activate venv เลย ใช้ `uv run` นำหน้าได้ทุกคำสั่ง (ทั้ง Mac/Windows):
> ```bash
> cd backend
> uv venv && uv pip install -e ".[dev]"
> uv run alembic upgrade head
> uv run uvicorn app.main:app --reload --port 8000
> ```

#### ⚛️ Frontend (Next.js) — เหมือนกันทั้ง Mac/Windows

```bash
cd frontend
npm install
npm run dev        # เปิดที่ http://localhost:3000
```

---

### โหมด B — Docker Compose (เหมือน Production)

สั่งเดียวได้ทั้ง backend + frontend พร้อม migration อัตโนมัติ:

```bash
docker compose up --build          # foreground (แสดง log)
docker compose up --build -d       # background mode
docker compose logs -f             # ดู log ต่อเนื่อง
docker compose down                # หยุดการทำงาน
```

> Backend container จะรัน `alembic upgrade head` ให้อัตโนมัติก่อนเริ่ม uvicorn และ Web container จะรอจน backend ผ่าน healthcheck (`/api/health`)

---

## 🌐 URLs หลังรัน

| Service | URL |
|---------|-----|
| Frontend (Next.js) | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| Swagger UI (Interactive API Docs) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
| Health Check | http://localhost:8000/api/health |

**เริ่มต้นใช้งาน:**  
เปิด http://localhost:3000/settings เพื่อระบุ e-Office Token และ Telegram Bot Token

---

## 🧰 Common Tasks (Cheatsheet)

| งาน | คำสั่ง |
|-----|--------|
| ตรวจสอบสถานะระบบ (Health) | `curl http://localhost:8000/api/health` |
| รัน Sweep แบบ Dry-run | `curl -X POST "http://localhost:8000/api/sweep/run?drs=2&dry_run=true"` |
| ทดสอบส่ง Telegram | `curl -X POST http://localhost:8000/api/telegram/test` |
| สร้าง Migration Script ใหม่ | `cd backend && uv run alembic revision --autogenerate -m "message"` |
| รัน Database Migration ล่าสุด | `cd backend && uv run alembic upgrade head` |
| ย้อนกลับ Migration 1 ขั้น | `cd backend && uv run alembic downgrade -1` |
| รัน Unit Tests (Backend) | `cd backend && uv run pytest` |
| Run Linter (Frontend) | `cd frontend && npm run lint` |
| Rebuild Container ใหม่ | `docker compose up --build --force-recreate` |

---

## 📡 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/health | ตรวจสอบสถานะ DB / Token / Telegram |
| GET | /api/config | รายการ config (mask secret) |
| POST | /api/config | บันทึก/อัปเดต config (encrypted) |
| DELETE | /api/config/{key} | ลบ config |
| GET | /api/schedule | รายการ schedules |
| POST | /api/schedule | สร้าง schedule ใหม่ |
| PATCH | /api/schedule/{id} | แก้ไข schedule |
| DELETE | /api/schedule/{id} | ลบ schedule |
| POST | /api/schedule/{id}/toggle | toggle enabled |
| GET | /api/documents | รายการเอกสาร (filter/search/paginate) |
| POST | /api/sweep/run | รัน sweep ทันที (?drs=2&dry_run=false) |
| GET | /api/logs | ประวัติการรัน sweep |
| POST | /api/telegram/test | ส่ง test message ไปยัง Telegram |

---

## ⚙️ Sweep Flow & Logic

```
โหลด config (decrypt token) 
→ เช็ค token valid (หมดอายุ → แจ้ง Telegram + log token_expired)
→ เรียก e-Office API (bucket 390, drs=2 หรือ 3)
→ อ่านสถานะจริงต่อฉบับจาก doc_rec_status + approve_date (ไม่พึ่ง drs)
→ dedup doc_id กับ DB (saraban_documents)
→ AI สรุป 5 มิติ (หรือ rule-based fallback)
→ upsert saraban_documents + บันทึก run_logs
→ ยิง Telegram (รอรับ=แจ้งอย่างเดียว เว้นแต่ auto_accept=true)
```

---

## 🔒 Security

- ทุก secret (token, bot_token, api_key) เข้ารหัส **Fernet** ก่อนบันทึกลง DB
- `FERNET_KEY` จัดเก็บในไฟล์ `.env` เท่านั้น — ไม่บันทึกลง codebase หรือฐานข้อมูล
- Endpoint `GET /api/config` คืนค่า `***` สำหรับฟิลด์ที่มีความลับเสมอ
- ฟีเจอร์ **auto_accept** ถูกตั้งต้นเป็น `false` เพื่อความปลอดภัย — ผู้ใช้ต้องเปิดเองในหน้า Schedule

---

## 🩺 Troubleshooting

| ปัญหา | วิธีแก้ |
|-------|---------|
| `psycopg2` build ล้มเหลว (macOS) | ติดตั้ง libpq: `brew install postgresql@16` แล้วลอง `uv pip install -e .` ใหม่ |
| `pg_config not found` (Windows) | ในโปรเจคใช้ `psycopg2-binary` อยู่แล้ว ตรวจสอบว่าไม่ได้เผลอลง `psycopg2` ตัวเต็ม |
| Port 8000 / 3000 ชน | macOS: `lsof -ti:8000 \| xargs kill -9`<br/>Windows: `netstat -ano \| findstr :8000` แล้วสั่ง `taskkill /PID <pid> /F` |
| `Activate.ps1 cannot be loaded` (Windows) | รัน `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` หรือใช้ `uv run` นำหน้าคำสั่ง |
| CORS error ที่หน้าเว็บ | เพิ่ม origin ปลายทางใน `CORS_ORIGINS` ของไฟล์ `.env` (คั่นด้วย comma) |
| ไม่สามารถเชื่อมต่อ DB ได้ | ตรวจสอบค่า `OPENCLAW_PG_URL` และตรวจว่า network เข้าถึงเครื่อง DB (`192.168.111.6:35432`) ได้ |
| แจ้งเตือน CRLF/LF ตอน commit (Windows) | รัน `git config --global core.autocrlf true` |
| ไม่พบคำสั่ง `uv` หลังติดตั้ง | ปิด-เปิด Terminal ใหม่ หรือเพิ่ม directory ใน PATH ให้ถูกต้อง |
