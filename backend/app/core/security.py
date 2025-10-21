# backend/app/core/security.py

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from .db import get_db
from ..models.user import User

# =========================
# Configuración de seguridad
# =========================

# ⚠️ Cambia esta clave por una generada (p. ej. con `openssl rand -hex 32`)
SECRET_KEY = "4f1c2a90b76f9f87392db86e21a38e74177fa631baf8b6c87643e0d21c1f84d2"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 horas

# Para Swagger: indica dónde obtener el token (nuestro endpoint de login)
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login") 

# Hash de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# =========================
# Utilidades de contraseñas
# =========================
def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compara contraseña en texto plano con su hash almacenado."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Genera el hash seguro de una contraseña."""
    return pwd_context.hash(password)


# =========================
# JWT (creación y validación)
# =========================
def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Crea un JWT firmando `data` (debe incluir un 'sub' identificador del usuario).
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta if expires_delta
        else timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extrae el usuario actual a partir del token Bearer enviado en Authorization.
    Espera que en el token venga 'sub' con el ID del usuario.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid authentication credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise credentials_exception
        user_id = int(sub)
    except (JWTError, ValueError):
        raise credentials_exception

    user = db.query(User).get(user_id)
    if not user:
        raise credentials_exception
    return user
