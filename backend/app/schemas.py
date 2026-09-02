"""Pydantic schemas matching the sprint's API contract."""

from pydantic import BaseModel, ConfigDict, EmailStr

CATEGORIES = ["Oberteil", "Hose", "Kleid", "Schuhe", "Accessoire"]


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ClothingItemCreate(BaseModel):
    name: str
    category: str


class ClothingItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    category: str
    image_url: str | None = None


class OutfitCreate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitUpdate(BaseModel):
    name: str
    item_ids: list[int]


class OutfitOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    items: list[ClothingItemOut]
