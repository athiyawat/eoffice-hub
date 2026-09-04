"""CRUD for app_config with Fernet encryption"""
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.config_model import AppConfig
from app.services.crypto_service import encrypt, decrypt, mask
from app.schemas.config_schema import ConfigRead, ConfigWrite


async def get_all_configs(db: AsyncSession) -> list[ConfigRead]:
    result = await db.execute(select(AppConfig).order_by(AppConfig.key))
    rows = result.scalars().all()
    out = []
    for row in rows:
        value = decrypt(row.value_enc or "") if not row.is_secret else None
        display = mask(row.value_enc or "") if row.is_secret else value
        out.append(ConfigRead(
            key=row.key,
            value=display,
            is_secret=row.is_secret,
            description=row.description,
            updated_at=row.updated_at,
        ))
    return out


async def get_config_value(db: AsyncSession, key: str) -> str | None:
    """Get decrypted config value by key"""
    result = await db.execute(select(AppConfig).where(AppConfig.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        return None
    return decrypt(row.value_enc or "")


async def set_config(db: AsyncSession, data: ConfigWrite) -> ConfigRead:
    result = await db.execute(select(AppConfig).where(AppConfig.key == data.key))
    row = result.scalar_one_or_none()

    encrypted = encrypt(data.value)

    if row is None:
        row = AppConfig(
            key=data.key,
            value_enc=encrypted,
            is_secret=data.is_secret,
            description=data.description,
            updated_at=datetime.now(timezone.utc),
        )
        db.add(row)
    else:
        row.value_enc = encrypted
        row.is_secret = data.is_secret
        if data.description is not None:
            row.description = data.description
        row.updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(row)

    display = mask(encrypted) if data.is_secret else data.value
    return ConfigRead(
        key=row.key,
        value=display,
        is_secret=row.is_secret,
        description=row.description,
        updated_at=row.updated_at,
    )


async def delete_config(db: AsyncSession, key: str) -> bool:
    result = await db.execute(select(AppConfig).where(AppConfig.key == key))
    row = result.scalar_one_or_none()
    if row is None:
        return False
    await db.delete(row)
    await db.commit()
    return True
