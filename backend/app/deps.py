# backend/app/deps.py
# Pequeño “hub” de dependencias para no acoplar routers entre sí.

# Re-exporta el get_db de tu capa de DB
from app.core.db import get_db

# Re-exporta el get_current_user del módulo de auth (donde ya validas el token)
from app.routers.auth import get_current_user

__all__ = ["get_db", "get_current_user"]
