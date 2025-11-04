# backend/migrations/env.py
from __future__ import annotations

import os
import sys
import importlib
import pkgutil
from pathlib import Path
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

# --- 1) sys.path: apunta al directorio backend/ para poder importar app.*
HERE = Path(__file__).resolve()                  # .../backend/migrations/env.py
BACKEND_DIR = HERE.parents[1]                    # .../backend
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# --- 2) Configuración / logging
config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# --- 3) Cargar .env y fijar DATABASE_URL en entorno ANTES de importar Base
try:
    from dotenv import load_dotenv
    load_dotenv()  # lee backend/.env si existe
except Exception:
    pass

APP_DATABASE_URL = None
# Intenta obtener desde settings de la app
try:
    from app.core.settings import DATABASE_URL as APP_DATABASE_URL
except Exception:
    APP_DATABASE_URL = None

# Fallback: variable de entorno directa
if not APP_DATABASE_URL:
    APP_DATABASE_URL = os.getenv("DATABASE_URL")

if not APP_DATABASE_URL:
    raise RuntimeError("DATABASE_URL no está definida. Revisa backend/.env o app.core.settings.")

# Pónsela al proceso para que cualquier import de la app la vea
os.environ["DATABASE_URL"] = APP_DATABASE_URL

# Y pásasela a Alembic
config.set_main_option("sqlalchemy.url", APP_DATABASE_URL)

# --- 4) Importar Base y modelos
from app.core.db import Base  # usa la misma Base que usa tu app

# Si tienes modelos dispersos, impórtalos explícitamente o autodescubre el paquete
# Imports explícitos (mantén/añade los que tengas):
import app.models.campus       # __tablename__ = "campus"
import app.models.user         # __tablename__ = "users"
import app.models.product      # __tablename__ = "products" (ajusta si aplica)

# Autoload opcional de TODOS los submódulos en app.models (por si agregas más modelos)
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
                # no detenemos migraciones si un modelo falla al importar
                pass

_import_submodules("app.models")

# --- 5) target_metadata: ¡DEBE estar definido!
target_metadata = Base.metadata

# --- 6) Runners de Alembic
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
