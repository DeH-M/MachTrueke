# backend/app/routers/auth.py
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import or_
from fastapi import File, UploadFile             # 👈 nuevo
from ..utils.files import save_image

from ..core.db import get_db
from ..core.security import (
    create_access_token,
    get_current_user,
)
from ..core.settings import ALLOWED_EMAIL_DOMAINS, EMAIL_VERIFICATION_MODE
from ..core.email_utils import normalize_and_validate_format, domain_has_mx

from ..models.user import User
from ..models.campus import Campus
from ..schemas.user import UserCreate, UserRead, UserUpdate, ChangePasswordIn
from ..schemas.auth import Token 
from ..utils.files import save_image, delete_local_file_if_inside_static
from ..schemas.user import UserRead

# 👇 usa la capa CRUD
from ..crud.user import (
    create_user,
    authenticate_user,
    update_user_profile,
    change_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])


# ------------------------------
# Helpers (dominios permitidos)
# ------------------------------
def _check_allowed_domain(email: str) -> str:
    """
    Normaliza email, valida formato y verifica dominio permitido.
    Retorna el email normalizado (lower) si todo está OK.
    """
    try:
        email_norm, domain = normalize_and_validate_format(email)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Email inválido: {e}")

    allowed = [d.strip().lower() for d in ALLOWED_EMAIL_DOMAINS]
    if domain not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Solo correos de: {', '.join(ALLOWED_EMAIL_DOMAINS)}",
        )

    if EMAIL_VERIFICATION_MODE == "dns" and not domain_has_mx(domain):
        raise HTTPException(status_code=400, detail="Dominio sin MX válido (correo no entregable)")

    return email_norm


# ------------------------------
#   CAMPUS (para el desplegable)
# ------------------------------
@router.get("/campuses")
def list_campuses(q: str | None = Query(None), db: Session = Depends(get_db)):
    query = db.query(Campus)
    if q:
        q = f"%{q.strip()}%"
        query = query.filter(or_(Campus.code.ilike(q), Campus.name.ilike(q)))
    return query.order_by(Campus.code).all()


# ------------------------------
#           REGISTER
# ------------------------------
@router.post("/register", response_model=UserRead, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    # 1) Validar contraseñas
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Las contraseñas no coinciden")

    # 2) Normalizar / validar email y dominio institucional
    email = _check_allowed_domain(payload.email)

    # 3) Crear vía CRUD y mapear errores a HTTP
    try:
        user = create_user(
            db=db,
            username=payload.username,
            full_name=payload.full_name,
            email=email,
            password=payload.password,
            campus_id=payload.campus_id,
        )
    except ValueError as e:
        # errores de unicidad
        if str(e) == "email_taken":
            raise HTTPException(status_code=400, detail="Email ya registrado")
        if str(e) == "username_taken":
            raise HTTPException(status_code=400, detail="Nombre de usuario ya registrado")
        raise
    except LookupError as e:
        if str(e) == "campus_not_found":
            raise HTTPException(status_code=404, detail="Campus no encontrado")
        raise

    return user


# ------------------------------
#            LOGIN
# ------------------------------
@router.post("/login", response_model=Token)  # o usa Token si ya tienes schemas.auth.Token
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    # En form.username viene el email
    email = _check_allowed_domain(form.username)

    user = authenticate_user(db, email=email, password=form.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Email o contraseña incorrectos")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


# ------------------------------
#             ME
# ------------------------------
@router.get("/me", response_model=UserRead)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ------------------------------
#       UPDATE MY PROFILE
# ------------------------------
@router.put("/me", response_model=UserRead)
def update_me(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        updated = update_user_profile(
            db,
            user=current_user,
            username=payload.username,
            bio=payload.bio,
            avatar_url=payload.avatar_url,
            campus_id=payload.campus_id,
        )
    except ValueError as e:
        if str(e) == "username_taken":
            raise HTTPException(status_code=400, detail="Nombre de usuario ya registrado")
        raise
    except LookupError as e:
        if str(e) == "campus_not_found":
            raise HTTPException(status_code=404, detail="Campus no encontrado")
        raise
    return updated


# ------------------------------
#        CHANGE PASSWORD
# ------------------------------
@router.post("/me/change-password", status_code=204)
def change_my_password(
    payload: ChangePasswordIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        change_password(
            db,
            user=current_user,
            old_password=payload.old_password,
            new_password=payload.new_password,
        )
    except ValueError as e:
        if str(e) == "invalid_old_password":
            raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
        raise
    # 204 No Content

@router.delete("/me", status_code=204)
def delete_me(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    db.delete(current_user)
    db.commit()
    # 204 No Content


@router.post("/me/avatar", response_model=UserRead)
async def upload_my_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_url = await save_image(file, subdir="avatars")
    # si quieres reemplazar y borrar la anterior:
    delete_local_file_if_inside_static(current_user.avatar_url)
    current_user.avatar_url = new_url
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/avatar", response_model=UserRead)
def delete_my_avatar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    delete_local_file_if_inside_static(current_user.avatar_url)
    current_user.avatar_url = None
    db.commit()
    db.refresh(current_user)
    return current_user

