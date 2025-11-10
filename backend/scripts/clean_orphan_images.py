# scripts/clean_orphan_images.py
from pathlib import Path
from app.core.db import SessionLocal
from app.models.product import ProductImage
from app.main import MEDIA_DIR  # ya lo tienes en main.py

def exists(rel_url: str) -> bool:
    if not rel_url:
        return False
    p = (MEDIA_DIR / rel_url.lstrip("/")).resolve()
    return str(p).startswith(str(MEDIA_DIR.resolve())) and p.exists()

with SessionLocal() as db:
    imgs = db.query(ProductImage).all()
    removed = 0
    for pi in imgs:
        if not exists(pi.url):
            db.delete(pi)
            removed += 1
    if removed:
        db.commit()
    print(f"Removed {removed} orphan product_images")
