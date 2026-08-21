import hashlib
import os
import secrets
import json
import base64
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import Depends, HTTPException, Header, status
from sqlalchemy.orm import Session

from database import get_db
import models

SECRET_KEY = os.getenv("SECRET_KEY", "nivaran-sih-2026-secret-key-super-secure")
TOKEN_EXPIRE_HOURS = 72


def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hashes password using PBKDF2-HMAC-SHA256 with 100,000 iterations and salt."""
    if not salt:
        salt = secrets.token_hex(16)
    
    pwd_bytes = password.encode('utf-8')
    salt_bytes = salt.encode('utf-8')
    
    key = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt_bytes, 100000)
    hash_str = key.hex()
    return hash_str, salt


def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies candidate password against stored PBKDF2-HMAC-SHA256 hash."""
    calc_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(calc_hash, password_hash)


def create_access_token(user: models.User) -> str:
    """Generates a secure signed session token for the user."""
    payload = {
        "sub": user.id,
        "email": user.email,
        "role": user.role,
        "full_name": user.full_name,
        "ward": user.ward or "Ward 4 - Andheri West",
        "exp": (datetime.utcnow() + timedelta(hours=TOKEN_EXPIRE_HOURS)).timestamp()
    }
    json_bytes = json.dumps(payload).encode('utf-8')
    encoded_payload = base64.urlsafe_b64encode(json_bytes).decode('utf-8').rstrip('=')
    
    # Signature
    signature = hashlib.sha256(f"{encoded_payload}.{SECRET_KEY}".encode('utf-8')).hexdigest()[:32]
    return f"{encoded_payload}.{signature}"


def decode_token(token: str) -> Optional[dict]:
    """Decodes and validates a session token signature and expiration."""
    if not token or "." not in token:
        return None
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        encoded_payload, signature = parts
        
        expected_sig = hashlib.sha256(f"{encoded_payload}.{SECRET_KEY}".encode('utf-8')).hexdigest()[:32]
        if not secrets.compare_digest(expected_sig, signature):
            return None
        
        # Add padding back if stripped
        padded_b64 = encoded_payload + "=" * (-len(encoded_payload) % 4)
        json_bytes = base64.urlsafe_b64decode(padded_b64)
        payload = json.loads(json_bytes.decode('utf-8'))
        
        if payload.get("exp") and datetime.utcnow().timestamp() > payload["exp"]:
            return None # Expired
            
        return payload
    except Exception:
        return None


def get_current_user_optional(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> Optional[models.User]:
    """FastAPI dependency: Returns User if valid Bearer token provided, else None."""
    if not authorization:
        return None
    
    token = authorization.replace("Bearer ", "").strip()
    payload = decode_token(token)
    if not payload:
        return None
    
    user_id = payload.get("sub")
    if not user_id:
        return None
        
    return db.query(models.User).filter(models.User.id == user_id, models.User.account_status == "ACTIVE").first()


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
) -> models.User:
    """FastAPI dependency: Requires valid authenticated User or raises 401 Unauthorized."""
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"}
        )
    return user


def require_roles(allowed_roles: List[str]):
    """FastAPI dependency factory to enforce RBAC permissions."""
    def role_checker(current_user: models.User = Depends(get_current_user)):
        if current_user.role not in allowed_roles and current_user.role != "SUPER_ADMIN":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required role: {allowed_roles}"
            )
        return current_user
    return role_checker
