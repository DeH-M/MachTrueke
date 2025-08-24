from pydantic import BaseModel, Field
from typing import Optional

class UserBase(BaseModel):
    email: str
    name: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(min_length=6)

class UserRead(UserBase):
    id: int
    class Config:
        from_attributes = True
