from typing import List, Optional
from uuid import uuid4
from pathlib import Path
import shutil

from fastapi import APIRouter, Depends, HTTPException, status, Query, Path as FPath, File, UploadFile, Form
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user
from ..models.product import Product, ProductImage
from ..models.user import User
from ..schemas.product import ProductCreate, ProductRead, ProductUpdate

# Carpeta de medios (coherente con main.py)
MEDIA_ROOT = Path("media")
PRODUCTS_DIR = MEDIA_ROOT / "products"
PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)

router = APIRouter()

# ---------- Listado público (solo activos) + búsqueda y paginación ----------
@router.get("/", response_model=List[ProductRead])
def list_products(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Búsqueda por título o descripción"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    query = db.query(Product).filter(Product.is_active.is_(True))
    if q:
        like = f"%{q}%"
        query = query.filter((Product.title.ilike(like)) | (Product.description.ilike(like)))
    products = (
        query.order_by(Product.id.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return products

# ---------- Detalle público ----------
@router.get("/{product_id}", response_model=ProductRead)
def get_product(
    product_id: int = FPath(..., ge=1),
    db: Session = Depends(get_db),
):
    p = db.query(Product).get(product_id)
    if not p or not p.is_active:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    return p

# ---------- Crear con imágenes (multipart/form-data) ----------
@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
async def create_product(
    title: str = Form(..., min_length=1, max_length=120),
    description: str = Form(..., min_length=1, max_length=2000),
    images: Optional[List[UploadFile]] = File(None),  # 0..N imágenes
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = Product(title=title, description=description, owner_id=current_user.id)
    db.add(product)
    db.commit()
    db.refresh(product)

    saved_images: List[ProductImage] = []
    if images:
        product_folder = PRODUCTS_DIR / str(product.id)
        product_folder.mkdir(parents=True, exist_ok=True)

        for img in images:
            # nombre único
            ext = Path(img.filename).suffix.lower() or ".jpg"
            filename = f"{uuid4().hex}{ext}"
            dest = product_folder / filename

            with dest.open("wb") as f:
                shutil.copyfileobj(img.file, f)

            url = f"/media/products/{product.id}/{filename}"  # URL pública
            saved_images.append(ProductImage(product_id=product.id, url=url))

        db.add_all(saved_images)
        db.commit()
        db.refresh(product)

    return product

# ---------- Mis productos ----------
@router.get("/me/mine", response_model=List[ProductRead])
def list_my_products(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Product)
        .filter(Product.owner_id == current_user.id)
        .order_by(Product.id.desc())
        .all()
    )

# ---------- Update (patch) ----------
@router.patch("/{product_id}", response_model=ProductRead)
def update_product(
    product_id: int = FPath(..., ge=1),
    payload: ProductUpdate = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if p.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes modificar este producto")

    if payload.title is not None:
        p.title = payload.title
    if payload.description is not None:
        p.description = payload.description
    if payload.is_active is not None:
        p.is_active = payload.is_active

    db.commit()
    db.refresh(p)
    return p

# ---------- Agregar imágenes a un producto existente ----------
@router.post("/{product_id}/images", response_model=ProductRead)
async def add_images(
    product_id: int = FPath(..., ge=1),
    images: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if p.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes modificar este producto")

    product_folder = PRODUCTS_DIR / str(p.id)
    product_folder.mkdir(parents=True, exist_ok=True)

    new_imgs = []
    for img in images:
        ext = Path(img.filename).suffix.lower() or ".jpg"
        filename = f"{uuid4().hex}{ext}"
        dest = product_folder / filename
        with dest.open("wb") as f:
            shutil.copyfileobj(img.file, f)
        url = f"/media/products/{p.id}/{filename}"
        new_imgs.append(ProductImage(product_id=p.id, url=url))

    db.add_all(new_imgs)
    db.commit()
    db.refresh(p)
    return p

# ---------- Borrar imagen específica (opcional) ----------
@router.delete("/{product_id}/images/{image_id}", status_code=204)
def delete_image(
    product_id: int,
    image_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if p.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes modificar este producto")

    img = db.query(ProductImage).filter_by(id=image_id, product_id=product_id).first()
    if not img:
        raise HTTPException(status_code=404, detail="Imagen no encontrada")

    # intenta borrar del disco (best-effort)
    path = Path(img.url.lstrip("/"))
    try:
        if path.exists():
            path.unlink()
    except Exception:
        pass

    db.delete(img)
    db.commit()
    return None

# ---------- Borrado (soft delete) ----------
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int = FPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    p = db.query(Product).get(product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
    if p.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="No puedes eliminar este producto")

    p.is_active = False
    db.commit()
    return None
