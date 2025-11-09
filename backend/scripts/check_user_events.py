# /backend/scripts/check_user_events.py
import sys
from pathlib import Path
from sqlalchemy import text  # <-- IMPORTANTE para SQLAlchemy 2.x

# Asegura que /backend esté en sys.path
THIS_FILE = Path(__file__).resolve()
BACKEND_DIR = THIS_FILE.parents[1]   # .../backend
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app.core.db import SessionLocal  # usa tu SessionLocal real

def main():
    with SessionLocal() as db:
        # 1) Verificar existencia de la tabla
        table = db.execute(text("SELECT to_regclass('public.user_events')")).scalar()
        print("table:", table)  # esperado: public.user_events

        # 2) Contar filas
        count = db.execute(text("SELECT COUNT(*) FROM public.user_events")).scalar()
        print("count:", count)   # esperado: 0 si aún no hay eventos

if __name__ == "__main__":
    main()
