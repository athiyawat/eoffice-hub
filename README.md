# e-Office Saraban Manager

ระบบจัดการสารบรรณ e-Office อัตโนมัติของ NT PLC  
Full-stack: **Next.js 15** (frontend) + **FastAPI Python 3.12** (backend)

---

## 🗂️ โครงสร้างไฟล์

```
20260904_eoffice-saraban-manager/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── pyproject.toml
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   │       └── 20260904_0001_initial_tables.py
│   └── app/
│       ├── main.py          ← FastAPI app + lifespan
│       ├── config.py        ← Settings (pydantic-settings)
│       ├── db.py            ← Async SQLAlchemy engine
│       ├── models/          ← ORM models
│       ├── schemas/         ← Pydantic v2 schemas
│       ├── services/
│       │   ├── crypto_service.py     ← Fernet encrypt/decrypt
│       │   ├── config_service.py     ← CRUD app_config
│       │   ├── eoffice_client.py     ← e-Office API client
│       │   ├── ai_summarizer.py      ← AI 5-dimension summarizer
│       │   ├── telegram_service.py   ← Telegram notifications
│       │   ├── sweep_service.py      ← Core sweep flow
│       │   └── scheduler_service.py  ← APScheduler management
│       └── routers/         ← FastAPI route handlers
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── next.config.ts
    └── src/
        ├── app/             ← Next.js App Router pages
        │   ├── dashboard/
        │   ├── documents/
        │   ├── schedule/
        │   ├── settings/
        │   ├── notifications/
        │   └── logs/
        ├── components/
        │   └── saraban/     ← Shared components
        └── lib/
            ├── api.ts       ← API client + types
            ├── utils.ts     ← Utilities + color configs
            └── providers.tsx ← TanStack Query provider
```

---

## 🚀 วิธีรัน

### 1. สร้าง .env

```bash
cp .env.example .env
```

แก้ไข `.env`:
- `OPENCLAW_PG_URL` — connection string ไปยัง PostgreSQL ที่มีอยู่
- `FERNET_KEY` — Generate ด้วย:
  ```bash
  python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
  ```

### 2. รัน docker-compose

```bash
docker compose up -d
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs (Swagger): http://localhost:8000/docs

### 3. ตั้งค่าผ่าน Settings UI

เปิด http://localhost:3000/settings แล้วกรอก:
1. **e-Office Token** — ดูจาก Browser DevTools ที่ eoffice.ntplc.co.th → localStorage → `token_saraban`
2. **Telegram Bot Token** — ได้จาก @BotFather
3. **Telegram Chat ID** — ได้จาก @userinfobot หรือ getUpdates API

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
| GET | /api/logs | ประวัติการรัน |
| POST | /api/telegram/test | ส่ง test message |

---

## 🔒 Security

- ทุก secret (token, bot_token, api_key) เข้ารหัส **Fernet** ก่อนเก็บใน DB
- `FERNET_KEY` อยู่ใน env เท่านั้น — ไม่เก็บใน code หรือ DB
- GET /api/config คืนค่า `***` สำหรับ secret fields
- **auto_accept** default เป็น `false` เสมอ — ต้องเปิดโดยตรงในหน้า Schedule พร้อมคำเตือน

---

## 📋 DB Tables

### ตารางที่มีอยู่แล้ว
- `saraban_documents` — เอกสารสารบรรณจาก e-Office (DDL ใน saraban_db.js)

### ตารางใหม่ (Alembic migration)
- `app_config` — การตั้งค่าระบบ (encrypted)
- `schedules` — ตาราง schedule สำหรับ APScheduler
- `run_logs` — ประวัติการรัน sweep

---

## ⚙️ Sweep Flow

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

## 📅 Default Schedule

ยังไม่มี schedule เริ่มต้น — เพิ่มผ่านหน้า Schedule UI  
แนะนำ: `30 8 * * 1-5` (08:30 ทุกวันจันทร์-ศุกร์) และ `30 13 * * 1-5` (13:30)

---

## 🛠️ Development

```bash
# Backend
cd backend
pip install -e .
alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev
```
