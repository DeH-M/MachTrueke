# scripts/seed_campus.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).resolve().parents[1]))  # permite importar app/

import app.models.product
import app.models.user  # NO quitar, aunque no se use directamente

from app.core.db import SessionLocal
from app.models.campus import Campus

CAMPUS = [
    # Centros Temáticos (Metropolitanos)
    ("CUAAD", "Centro Universitario de Arte, Arquitectura y Diseño"),
    ("CUCBA", "Centro Universitario de Ciencias Biológicas y Agropecuarias"),
    ("CUCEA", "Centro Universitario de Ciencias Económico Administrativas"),
    ("CUCEI", "Centro Universitario de Ciencias Exactas e Ingenierías"),
    ("CUCS",  "Centro Universitario de Ciencias de la Salud"),
    ("CUCSH", "Centro Universitario de Ciencias Sociales y Humanidades"),
    ("CUGDL", "Centro Universitario de Guadalajara"),
    # Centros Regionales
    ("CUALTOS", "Centro Universitario de los Altos"),
    ("CUCHAPALA", "Centro Universitario de Chapala"),
    ("CUCIENEGA", "Centro Universitario de La Ciénega"),
    ("CUCOSTA", "Centro Universitario de la Costa"),
    ("CUCSUR", "Centro Universitario de la Costa Sur"),
    ("CULAGOS", "Centro Universitario de los Lagos"),
    ("CUNORTE", "Centro Universitario del Norte"),
    ("CUSUR", "Centro Universitario del Sur"),
    ("CUTLAJO", "Centro Universitario de Tlajomulco"),
    ("CUTLAQUEPAQUE", "Centro Universitario de Tlaquepaque"),
    ("CUTONALÁ", "Centro Universitario de Tonalá"),
    ("CUVALLES", "Centro Universitario de los Valles"),
    # Digital
    ("UDGVIRTUAL", "UDGVirtual"),
]

db = SessionLocal()
try:
    for code, name in CAMPUS:
        row = db.query(Campus).filter((Campus.code == code) | (Campus.name == name)).first()
        if not row:
            db.add(Campus(code=code, name=name))
    db.commit()
    print("✔ Campus sembrados/actualizados correctamente.")
finally:
    db.close()
