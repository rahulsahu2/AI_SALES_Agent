import base64
from datetime import datetime, timedelta, timezone
from typing import Any, Union
from jose import jwt
from passlib.context import CryptContext
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

ALGORITHM = "HS256"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# AES-256-GCM Encryption/Decryption for Tenant API Keys
def encrypt_secret(plain_text: str) -> str:
    """
    Encrypts a string using AES-GCM with settings.ENCRYPTION_KEY.
    Returns a base64 encoded string containing nonce + ciphertext.
    """
    if not plain_text:
        return ""
    
    # Standardize encryption key to exactly 32 bytes
    key_bytes = settings.ENCRYPTION_KEY.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"\0")
    elif len(key_bytes) > 32:
        key_bytes = key_bytes[:32]
        
    aesgcm = AESGCM(key_bytes)
    nonce = AESGCM.generate_nonce()
    ciphertext = aesgcm.encrypt(nonce, plain_text.encode("utf-8"), None)
    
    # Combine nonce and ciphertext and encode as base64
    combined = nonce + ciphertext
    return base64.b64encode(combined).decode("utf-8")

def decrypt_secret(encrypted_text: str) -> str:
    """
    Decrypts a base64 encoded string containing nonce + ciphertext using settings.ENCRYPTION_KEY.
    """
    if not encrypted_text:
        return ""
        
    key_bytes = settings.ENCRYPTION_KEY.encode("utf-8")
    if len(key_bytes) < 32:
        key_bytes = key_bytes.ljust(32, b"\0")
    elif len(key_bytes) > 32:
        key_bytes = key_bytes[:32]
        
    aesgcm = AESGCM(key_bytes)
    try:
        combined = base64.b64decode(encrypted_text.encode("utf-8"))
        nonce = combined[:12]  # Standard AES-GCM nonce size is 12 bytes
        ciphertext = combined[12:]
        decrypted = aesgcm.decrypt(nonce, ciphertext, None)
        return decrypted.decode("utf-8")
    except Exception as e:
        # If decryption fails (e.g. invalid format/key), return empty or handle gracefully
        return ""
