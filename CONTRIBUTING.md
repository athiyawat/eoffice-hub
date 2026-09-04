# 🌿 Contributing — e-Office Saraban Manager

ขอบคุณที่ร่วมพัฒนาโปรเจกต์นี้! กรุณาอ่านคู่มือนี้ก่อนเปิด PR ครับ

---

## 📐 Branch Naming

```
feature/<ชื่อฟีเจอร์>    # เพิ่มฟีเจอร์ใหม่
fix/<ชื่อบัก>            # แก้บัก
chore/<งาน>             # งาน infra / config / dependency
docs/<หัวข้อ>           # อัปเดตเอกสาร
refactor/<ส่วน>         # ปรับโครงสร้างโค้ด
```

ตัวอย่าง:
```bash
git checkout -b feature/auto-forward-telegram
git checkout -b fix/sweep-duplicate-detection
```

---

## ✍️ Commit Message Convention

ใช้รูปแบบ **Conventional Commits**:

```
<type>(<scope>): <short description>
```

| type | ใช้เมื่อ |
|------|---------|
| `feat` | เพิ่มฟีเจอร์ใหม่ |
| `fix` | แก้บัก |
| `chore` | งาน infra / config / deps |
| `docs` | อัปเดตเอกสาร |
| `refactor` | ปรับโครงสร้างโค้ด (ไม่เพิ่ม/ลด feature) |
| `test` | เพิ่ม/แก้ test |
| `perf` | ปรับปรุง performance |

ตัวอย่าง:
```bash
git commit -m "feat(sweep): add urgency classification via AI"
git commit -m "fix(schedule): prevent duplicate sweep on restart"
git commit -m "chore: upgrade alembic to 1.14"
```

---

## 🔄 Git Workflow

```bash
# 1. Sync จาก main ล่าสุดก่อนเสมอ
git checkout main
git pull --rebase origin main

# 2. สร้าง branch ใหม่
git checkout -b feature/<ชื่อ>

# 3. ทำงาน + commit เป็นจุดๆ
git add -p                         # เลือก hunk ที่ต้องการ (แนะนำมากกว่า git add .)
git commit -m "feat: ..."

# 4. Push และเปิด PR
git push origin feature/<ชื่อ>
# เปิด PR ที่: https://github.com/athiyawat/eoffice-hub/compare
```

---

## ✅ Checklist ก่อนเปิด PR

- [ ] `uv run pytest` ผ่านหมด (backend)
- [ ] `uv run alembic upgrade head` ไม่มี error
- [ ] `npm run build` ผ่านไม่มี error (frontend)
- [ ] ไม่มีไฟล์ `.env` หรือ `FERNET_KEY` ติดมากับ commit
- [ ] commit message ถูกต้องตาม convention
- [ ] ถ้าเพิ่ม DB column ใหม่ → มี Alembic migration script แนบมาด้วย

---

## 🚫 สิ่งที่ไม่ควรทำ

- ❌ อย่า commit ตรงที่ `main` branch โดยไม่ผ่าน PR
- ❌ อย่า force push บน `main`
- ❌ อย่าใส่ `FERNET_KEY` / `OPENCLAW_PG_URL` / credentials ใน code หรือ commit message
- ❌ อย่าแก้ไข Alembic migration ที่ push ไปแล้ว — ให้สร้าง migration ใหม่แทน
