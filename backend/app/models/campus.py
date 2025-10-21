# app/models/campus.py
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String
from ..core.db import Base  # <- ojo a los dos puntos (relative import)

class Campus(Base):
    __tablename__ = "campus"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)

    # relación inversa con User (no rompe si aún no importas User aquí)
    users = relationship("User", back_populates="campus", cascade="all,delete", lazy="selectin")
