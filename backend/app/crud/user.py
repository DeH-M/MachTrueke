# backend/app/crud/user.py
from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy import or_

from ..models.user import User
from ..models.campus import Campus
from ..core.security import get_password_hash, verify_password


# ============ GETTERS ============
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email.strip().lower()).first()

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    return db.query(User).filter(User.username == username.strip().lower()).first()

def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
    return db.get(User, user_id)


# ============ AUTH ============
def authenticate_user(db: Session, *, email: str, password: str) -> Optional[User]:
    user = get_user_by_email(db, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


# ============ CREATE ============
def create_user(
    db: Session,
    *,
    username: str,
    full_name: Optional[str],
    email: str,
    password: str,
    campus_id: Optional[int] = None,
) -> User:
    """
    Lanza:
      - ValueError('email_taken')
      - ValueError('username_taken')
      - LookupError('campus_not_found')
    """
    username_n = username.strip().lower()
    email_n = email.strip().lower()

    existing = (
        db.query(User)
        .filter(or_(User.email == email_n, User.username == username_n))
        .first()
    )
    if existing:
        if existing.email == email_n:
            raise ValueError("email_taken")
        raise ValueError("username_taken")

    if campus_id is not None:
        campus = db.get(Campus, campus_id)
        if not campus:
            raise LookupError("campus_not_found")

    user = User(
        username=username_n,
        full_name=(full_name or "").strip() or None,
        email=email_n,
        hashed_password=get_password_hash(password),
        campus_id=campus_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ============ UPDATE PERFIL ============
def update_user_profile(
    db: Session,
    *,
    user: User,
    username: Optional[str] = None,
    bio: Optional[str] = None,
    campus_id: Optional[int] = None,
) -> User:
    """
    Actualiza perfil editable (NO avatar).
    Lanza:
      - ValueError('username_taken')
      - LookupError('campus_not_found')
    """
    if username is not None:
        new_un = username.strip().lower()
        if new_un != user.username:
            if get_user_by_username(db, new_un):
                raise ValueError("username_taken")
            user.username = new_un

    if bio is not None:
        user.bio = bio

    if campus_id is not None:
        if campus_id == 0:
            user.campus_id = None
        else:
            campus = db.get(Campus, campus_id)
            if not campus:
                raise LookupError("campus_not_found")
            user.campus_id = campus_id

    db.commit()
    db.refresh(user)
    return user


# ============ CHANGE PASSWORD ============
def change_password(
    db: Session,
    *,
    user: User,
    old_password: str,
    new_password: str,
) -> None:
    if not verify_password(old_password, user.hashed_password):
        raise ValueError("invalid_old_password")
    user.hashed_password = get_password_hash(new_password)
    db.commit()
