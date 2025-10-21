# backend/migrations/env.py
from __future__ import annotations

import sys
from pathlib import Path
from logging.config import fileConfig
import importlib
import pkgutil

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- 1) sys.path primero
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.append(str(BACKEND_DIR))

# --- 2) Config / logging
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- 3) URL desde tu app
try:
    from app.core.settings import DATABASE_URL as APP_DATABASE_URL
except Exception:
    try:
        from app.core.db import SQLALCHEMY_DATABASE_URL as APP_DATABASE_URL
    except Exception:
        APP_DATABASE_URL = None

# --- 4) Base y modelos (importa explícitamente lo necesario)
from app.core.db import Base

# IMPORTS EXPLÍCITOS para que Alembic “vea” TODAS las tablas
import app.models.campus   # __tablename__ = "campus"
import app.models.user     # __tablename__ = "users"
import app.models.product  # FK a users

# (Opcional) autoload de todos los submódulos por si tienes más modelos
def _import_submodules(package_name: str) -> None:
    try:
        pkg = importlib.import_module(package_name)
    except Exception:
        return
    if hasattr(pkg, "__path__"):
        for _, modname, _ in pkgutil.walk_packages(pkg.__path__, pkg.__name__ + "."):
            try:
                importlib.import_module(modname)
            except Exception:
                pass

# _import_submodules("app.models")

# --- 5) target_metadata UNA sola vez
target_metadata = Base.metadata

# --- 6) Inyecta URL real
if APP_DATABASE_URL:
    config.set_main_option("sqlalchemy.url", APP_DATABASE_URL)

# --- 7) Alembic runners
def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )
    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )
        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
