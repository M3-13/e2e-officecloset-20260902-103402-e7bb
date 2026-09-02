"""Clothing-item endpoints (stubs — filled by the items ticket)."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.deps import get_current_user
from app.models import User
from app.schemas import ClothingItemOut

router = APIRouter(prefix="/api/items", tags=["items"])


@router.post("", response_model=ClothingItemOut, status_code=201)
def create_item(
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="items ticket implements create_item")


@router.get("", response_model=list[ClothingItemOut])
def list_items(
    category: str | None = None,
    current_user: User = Depends(get_current_user),
) -> list[ClothingItemOut]:
    raise HTTPException(status_code=501, detail="items ticket implements list_items")


@router.get("/{item_id}", response_model=ClothingItemOut)
def get_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="items ticket implements get_item")


@router.put("/{item_id}", response_model=ClothingItemOut)
def update_item(
    item_id: int,
    name: str = Form(...),
    category: str = Form(...),
    image: UploadFile | None = File(None),
    current_user: User = Depends(get_current_user),
) -> ClothingItemOut:
    raise HTTPException(status_code=501, detail="items ticket implements update_item")


@router.delete("/{item_id}", status_code=204)
def delete_item(
    item_id: int,
    current_user: User = Depends(get_current_user),
) -> None:
    raise HTTPException(status_code=501, detail="items ticket implements delete_item")


@router.get("/{item_id}/image")
def get_item_image(
    item_id: int,
    current_user: User = Depends(get_current_user),
) -> None:
    raise HTTPException(status_code=501, detail="items ticket implements get_item_image")
