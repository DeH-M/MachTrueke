# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field, constr
from typing import Optional

# ==============================================
# 🔹 ESQUEMAS BASE
# ==============================================
class UserBase(BaseModel):
    username: str
    full_name: Optional[str]
    email: EmailStr
    campus_id: Optional[int] = None

    model_config = {"from_attributes": True}



# ==============================================
# 🔹 CREACIÓN DE USUARIO (registro)
# ==============================================
class UserCreate(BaseModel):
    username: constr(strip_whitespace=True, min_length=3, max_length=30)
    full_name: Optional[str] = None
    email: EmailStr
    password: constr(min_length=6)
    confirm_password: constr(min_length=6)
    campus_id: Optional[int] = None


# ==============================================
# 🔹 RESPUESTA PÚBLICA (sin contraseña)
# ==============================================
class UserRead(BaseModel):
    id: int
    username: str
    full_name: Optional[str]
    email: EmailStr
    campus_id: Optional[int]
    bio: Optional[str] = None
    avatar_url: Optional[str] = None
    is_active: Optional[bool] = True

    model_config = {"from_attributes": True}


# ==============================================
# 🔹 ACTUALIZACIÓN DE PERFIL
# ==============================================
class UserUpdate(BaseModel):
    username: Optional[str] = None
    bio: Optional[str] = None
    campus_id: Optional[int] = None

    model_config = {"from_attributes": True}
    
class ChangePasswordIn(BaseModel):
    old_password: str = Field(min_length=6)
    new_password: str = Field(min_length=6)


# ==============================================
# 🔹 PERFIL PÚBLICO MINIMAL (para evitar ciclos en anidaciones)
#    Úsalo en otros esquemas (p. ej. ProductRead.owner)
# ==============================================
class UserPublic(BaseModel):
    id: int
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

    model_config = {"from_attributes": True}

