from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

# --- Collection Schemas ---
class CollectionCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class CollectionResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Note Schemas ---
class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: Optional[str] = None
    collection_id: Optional[int] = None  # <-- Naya field add kiya

class NoteResponse(BaseModel):
    id: int
    title: str
    content: Optional[str]
    user_id: int
    collection_id: Optional[int]  # <-- Naya field add kiya
    created_at: datetime

    model_config = {"from_attributes": True}

# --- Document Schemas ---
class DocumentResponse(BaseModel):
    id: int
    file_name: str
    extracted_text: Optional[str] = None
    note_id: int
    created_at: datetime

    model_config = {"from_attributes": True}

class MeetingCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)

class MeetingResponse(BaseModel):
    id: int
    title: str
    room_name: str
    user_id: int
    created_at: datetime

    model_config = {"from_attributes": True}