"""GET+POST /api/config — encrypted config management"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_db
from app.schemas.config_schema import ConfigRead, ConfigWrite
from app.services.config_service import get_all_configs, set_config, delete_config

router = APIRouter(prefix="/api/config", tags=["config"])


@router.get("", response_model=list[ConfigRead])
async def list_configs(db: AsyncSession = Depends(get_db)):
    return await get_all_configs(db)


@router.post("", response_model=ConfigRead)
async def upsert_config(data: ConfigWrite, db: AsyncSession = Depends(get_db)):
    return await set_config(db, data)


@router.delete("/{key}")
async def remove_config(key: str, db: AsyncSession = Depends(get_db)):
    deleted = await delete_config(db, key)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Config key '{key}' not found")
    return {"ok": True, "key": key}
