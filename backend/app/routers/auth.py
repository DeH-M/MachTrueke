# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import (
    # get_password_hash,  <-- QUITAR
    verify_password,
    create_access_token,
    get_current_user,
)
from ..core.settings import ALLOWED_EMAIL_DOMAINS, EMAIL_VERIFICATION_MODE
from ..core.email_utils import normalize_and_validate_format, domain_has_mx

from ..crud.user import (
    get_user_by_email, get_user_by_name, create_user
)

from ..models.user import User
from ..schemas.user import UserCreate, UserRead
from ..schemas.auth import Token

router = APIRouter()


@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # 1) Normaliza y valida formato del email
    try:
        email, domain = normalize_and_validate_format(payload.email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Email inválido: {e}")

    # 2) Dominios permitidos
    allowed = [d.strip().lower() for d in ALLOWED_EMAIL_DOMAINS]
    if domain not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Solo correos de: {', '.join(ALLOWED_EMAIL_DOMAINS)}"
        )

    # 3) DNS/MX si está activado
    if EMAIL_VERIFICATION_MODE == "dns" and not domain_has_mx(domain):
        raise HTTPException(status_code=400, detail="Dominio sin MX válido (correo no entregable)")

    # 4) Duplicados
    if get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email ya registrado")
    if get_user_by_name(db, payload.name):
        raise HTTPException(status_code=400, detail="Nombre ya registrado")

    # 5) Crear usuario -> el CRUD hashea la contraseña internamente
    user = create_user(db, name=payload.name, email=email, password=payload.password)
    return user


@router.post("/login", response_model=Token)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # Este form usa 'username' como campo; en nuestro caso ahí viene el EMAIL
    try:
        email, domain = normalize_and_validate_format(form.username)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Credenciales inválidas")

    allowed = [d.strip().lower() for d in ALLOWED_EMAIL_DOMAINS]
    if domain not in allowed:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Solo correos de: {', '.join(ALLOWED_EMAIL_DOMAINS)}"
        )

    if EMAIL_VERIFICATION_MODE == "dns" and not domain_has_mx(domain):
        raise HTTPException(status_code=400, detail="Dominio sin MX válido (correo no entregable)")

    user = get_user_by_email(db, email)
    if not user or not verify_password(form.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user



