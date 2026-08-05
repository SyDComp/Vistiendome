import hashlib
import bcrypt
import os
from datetime import datetime, timedelta
from typing import Any, Union
from jose import jwt

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise ValueError("SECRET_KEY environment variable is not set")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440")) # 24h

def create_access_token(subject: Union[str, Any], expires_delta: timedelta = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {"exp": expire, "sub": str(subject)}
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def _get_prehash(password: str) -> bytes:
    """Aplica SHA256 para normalizar la entrada a 32 bytes y evadir el lmite de 72 bytes de bcrypt."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest().encode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    # Comparamos el pre-hash para mantener consistencia con cualquier longitud
    pwd_bytes = _get_prehash(plain_password)
    return bcrypt.checkpw(pwd_bytes, hashed_password.encode('utf-8'))

def get_password_hash(password: str) -> str:
    # Generamos el hash de bcrypt sobre la base del pre-hash SHA256
    pwd_bytes = _get_prehash(password)
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode('utf-8')
