"""Outfit endpoints.

Every query is filtered on the current user, and foreign outfits answer 404 so
that a user can never observe another user's data (AC-07).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.deps import get_current_user, get_db
from app.models import ClothingItem, Outfit, User
from app.schemas import ClothingItemOut, OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


def _item_to_schema(item: ClothingItem) -> ClothingItemOut:
    return ClothingItemOut(
        id=item.id,
        name=item.name,
        category=item.category,
        image_url=f"/api/items/{item.id}/image" if item.image_path else None,
    )


def _outfit_to_schema(outfit: Outfit) -> OutfitOut:
    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        items=[_item_to_schema(item) for item in outfit.items],
    )


def _fetch_owned_items(db: Session, user_id: int, item_ids: list[int]) -> list[ClothingItem]:
    unique_ids = list(dict.fromkeys(item_ids))
    if not unique_ids:
        return []
    items = (
        db.query(ClothingItem)
        .filter(
            ClothingItem.id.in_(unique_ids),
            ClothingItem.user_id == user_id,
        )
        .all()
    )
    if len(items) != len(unique_ids):
        raise HTTPException(
            status_code=400,
            detail="Ein oder mehrere Kleidungsstücke gehören nicht zu deiner Garderobe",
        )
    by_id = {item.id: item for item in items}
    return [by_id[item_id] for item_id in unique_ids]


@router.post("", response_model=OutfitOut, status_code=201)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    items = _fetch_owned_items(db, current_user.id, payload.item_ids)
    outfit = Outfit(name=payload.name, user_id=current_user.id, items=items)
    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        items=[_item_to_schema(item) for item in items],
    )


@router.get("", response_model=list[OutfitOut])
def list_outfits(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OutfitOut]:
    outfits = db.query(Outfit).filter(Outfit.user_id == current_user.id).all()
    return [_outfit_to_schema(outfit) for outfit in outfits]


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    return _outfit_to_schema(outfit)


@router.put("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OutfitOut:
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    items = _fetch_owned_items(db, current_user.id, payload.item_ids)
    outfit.name = payload.name
    outfit.items = items
    db.commit()
    db.refresh(outfit)
    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        items=[_item_to_schema(item) for item in items],
    )


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    outfit = db.get(Outfit, outfit_id)
    if outfit is None or outfit.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Outfit nicht gefunden")
    db.delete(outfit)
    db.commit()
    return None
