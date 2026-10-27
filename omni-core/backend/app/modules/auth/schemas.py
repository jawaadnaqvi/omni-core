from pydantic import BaseModel, EmailStr
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str | None = None

class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}