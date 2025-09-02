# backend/app/schemas/user.py
from pydantic import BaseModel, EmailStr, Field

# --------- ESQUEMAS PÚBLICOS ---------
class UserBase(BaseModel):
    name: str
    email: EmailStr

class UserCreate(UserBase):
    # solo para ENTRADA; jamás en respuestas
    password: str = Field(min_length=6)

class UserRead(BaseModel):
    # solo para RESPUESTA; NO incluye password
    id: int
    name: str
    email: EmailStr

    # Pydantic v2:
    model_config = {"from_attributes": True}
    # Si usas Pydantic v1, comenta la línea anterior y descomenta:
    # class Config:
    #     orm_mode = True
