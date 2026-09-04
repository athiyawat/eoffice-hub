"""Fernet encryption/decryption for secrets stored in app_config"""
import base64
from cryptography.fernet import Fernet, InvalidToken

from app.config import settings

_fernet: Fernet | None = None


def get_fernet() -> Fernet:
    global _fernet
    if _fernet is None:
        key = settings.FERNET_KEY
        if not key:
            raise ValueError(
                "FERNET_KEY is not set. Generate one with: "
                "python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
            )
        _fernet = Fernet(key.encode() if isinstance(key, str) else key)
    return _fernet


def encrypt(plaintext: str) -> str:
    """Encrypt plaintext → base64 Fernet token (str)"""
    if not plaintext:
        return ""
    f = get_fernet()
    return f.encrypt(plaintext.encode("utf-8")).decode("utf-8")


def decrypt(token: str) -> str:
    """Decrypt Fernet token → plaintext. Returns '' on failure."""
    if not token:
        return ""
    try:
        f = get_fernet()
        return f.decrypt(token.encode("utf-8")).decode("utf-8")
    except (InvalidToken, Exception):
        return ""


MASK = "***"


def mask(value: str) -> str:
    """Return masked representation of a secret value"""
    return MASK if value else ""
