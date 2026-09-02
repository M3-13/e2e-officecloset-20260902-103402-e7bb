"""Outfit endpoints (stubs — filled by the outfits ticket)."""

from fastapi import APIRouter, Depends, HTTPException

from app.deps import get_current_user
from app.models import User
from app.schemas import OutfitCreate, OutfitOut, OutfitUpdate

router = APIRouter(prefix="/api/outfits", tags=["outfits"])


@router.post("", response_model=OutfitOut, status_code=201)
def create_outfit(
    payload: OutfitCreate,
    current_user: User = Depends(get_current_user),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits ticket implements create_outfit")


@router.get("", response_model=list[OutfitOut])
def list_outfits(current_user: User = Depends(get_current_user)) -> list[OutfitOut]:
    raise HTTPException(status_code=501, detail="outfits ticket implements list_outfits")


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits ticket implements get_outfit")


@router.put("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    payload: OutfitUpdate,
    current_user: User = Depends(get_current_user),
) -> OutfitOut:
    raise HTTPException(status_code=501, detail="outfits ticket implements update_outfit")


@router.delete("/{outfit_id}", status_code=204)
def delete_outfit(
    outfit_id: int,
    current_user: User = Depends(get_current_user),
) -> None:
    raise HTTPException(status_code=501, detail="outfits ticket implements delete_outfit")
