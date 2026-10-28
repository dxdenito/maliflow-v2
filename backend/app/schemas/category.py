import uuid

from pydantic import BaseModel, ConfigDict, Field, field_validator

ICON_PATTERN = r"^[a-z][a-z0-9-]*$"


def clean_name(value: str | None) -> str | None:
    if value is None:
        return None
    cleaned = value.strip()
    if not cleaned:
        raise ValueError("Name cannot be empty")
    return cleaned


class CategoryCreate(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    icon: str = Field(default="tag", max_length=30, pattern=ICON_PATTERN)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return clean_name(value)


class CategoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    icon: str | None = Field(default=None, max_length=30, pattern=ICON_PATTERN)
    is_active: bool | None = None

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str | None) -> str | None:
        return clean_name(value)


class CategoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    icon: str
    is_active: bool