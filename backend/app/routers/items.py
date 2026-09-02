"""Clothing-item endpoints: CRUD with image upload and strict per-user isolation.

Every query is scoped to the authenticated user; requesting an item that does
not belong to the caller answers 404, exactly like a non-existent item.
"""

from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from starlette.datastructures import UploadFile

from app.config import settings
from app.deps import get_current_user, get_db
from app.models import ClothingItem, User
from app.schemas import CATEGORIES, ClothingItemOut
from app.upload import (
    build_image_url,
    delete_image,
    enforce_upload_size_limit,
    save_image,
    validate_image,
)

router = APIRouter(prefix="/api/items", tags=["items"])

_MEDIA_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
}


def _get_owned_item(db: Session, item_id: int, user_id: int) -> ClothingItem:
    item = (
        db.query(ClothingItem)
        .filter(ClothingItem.id == item_id, ClothingItem.user_id == user_id)
        .first()
    )
    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kleidungsstück nicht gefunden.",
        )
    return item


def _to_out(item: ClothingItem) -> ClothingItemOut:
    return ClothingItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=build_image_url(item.id) if item.image_path else None,
    )


def _form_text(form, key: str) -> str:
    value = form.get(key)
    if not isinstance(value, str) or not value.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Feld '{key}' fehlt oder ist leer.",
        )
    return value.strip()


def _validate_category(category: str) -> None:
    if category not in CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Ungültige Kategorie '{category}'. Erlaubt: {', '.join(CATEGORIES)}.",
        )


def _form_image(form) -> UploadFile | None:
    image = form.get("image")
    if image is None:
        return None
    if isinstance(image, UploadFile):
        return image
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Ungültiges Bildfeld.",
    )


async def _parse_form(request: Request):
    try:
        return await request.form()
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ungültiger Anfrageinhalt.",
        ) from exc


@router.post("", response_model=ClothingItemOut, status_code=201)
async def create_item(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    enforce_upload_size_limit(request)
    form = await _parse_form(request)
    name = _form_text(form, "name")
    category = _form_text(form, "category")
    _validate_category(category)
    image = _form_image(form)

    extension = validate_image(image) if image is not None else None

    item = ClothingItem(name=name, category=category, user_id=current_user.id)
    db.add(item)
    db.flush()

    if image is not None and extension is not None:
        try:
            item.image_path = save_image(image, current_user.id, item.id, extension)
        except HTTPException:
            db.rollback()
            raise

    db.commit()
    db.refresh(item)
    return _to_out(item)


@router.get("", response_model=list[ClothingItemOut])
def list_items(
    category: str | None = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ClothingItemOut]:
    query = db.query(ClothingItem).filter(ClothingItem.user_id == current_user.id)
    if category:
        query = query.filter(ClothingItem.category == category)
    items = query.order_by(ClothingItem.id).all()
    return [_to_out(item) for item in items]


@router.get("/{item_id}", response_model=ClothingItemOut)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    return _to_out(_get_owned_item(db, item_id, current_user.id))


@router.put("/{item_id}", response_model=ClothingItemOut)
async def update_item(
    item_id: int,
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ClothingItemOut:
    enforce_upload_size_limit(request)
    item = _get_owned_item(db, item_id, current_user.id)
    form = await _parse_form(request)
    name = _form_text(form, "name")
    category = _form_text(form, "category")
    _validate_category(category)
    image = _form_image(form)

    old_path = item.image_path
    new_path = old_path
    if image is not None:
        extension = validate_image(image)
        try:
            new_path = save_image(image, current_user.id, item.id, extension)
        except HTTPException:
            db.rollback()
            raise

    item.name = name
    item.category = category
    item.image_path = new_path
    db.commit()
    db.refresh(item)

    if old_path and old_path != new_path:
        delete_image(old_path)

    return _to_out(item)


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    item = _get_owned_item(db, item_id, current_user.id)
    image_path = item.image_path
    db.delete(item)
    db.commit()
    if image_path:
        delete_image(image_path)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/{item_id}/image")
def get_item_image(
    item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> FileResponse:
    item = _get_owned_item(db, item_id, current_user.id)
    if not item.image_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Kein Bild für dieses Kleidungsstück vorhanden.",
        )
    path = Path(settings.upload_dir) / item.image_path
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Bild nicht gefunden.",
        )
    media_type = _MEDIA_TYPES.get(path.suffix.lower(), "application/octet-stream")
    return FileResponse(path, media_type=media_type)
