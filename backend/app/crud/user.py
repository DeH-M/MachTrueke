from sqlalchemy.orm import Session
from typing import Optional
from sqlalchemy.exc import IntegrityError
from ..models.user import User
from ..core.security import get_password_hash

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Busca un usuario por email."""
    return db.query(User).filter(User.email == email).first()

def get_user_by_name(db: Session, name: str) -> Optional[User]:
    return db.query(User).filter(User.name == name).first() 

def create_user(db: Session, *, email: str, name: str, password: str) -> User:
    """Crea un nuevo usuario con contraseña hasheada."""
    user = User(
        email=email,
        name=name,
        hashed_password=get_password_hash(password)
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Para que el endpoint pueda convertirlo a 400 y no 500
        raise ValueError("EMAIL_DUPLICATED")
    db.refresh(user)
    return user
