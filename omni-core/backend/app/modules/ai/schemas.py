from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional

class ChatRequest(BaseModel):
    """
    Schema for receiving a message from the user.
    """
    prompt: str = Field(..., min_length=1, description="User's question")
    # Optional: If provided, AI will only search within this specific note
    note_id: Optional[int] = Field(None, description="Target specific document ID")

class ChatResponse(BaseModel):
    """
    Schema for returning AI's answer.
    """
    response: str

class ChatMessageResponse(BaseModel):
    """
    Schema for returning historical chat messages.
    """
    id: int
    role: str
    content: str
    note_id: Optional[int] = None # Includes note_id to separate general and targeted chats
    created_at: datetime
    model_config = {"from_attributes": True}

class MockTestRequest(BaseModel):
    book_id: Optional[int] = None
    note_ids: Optional[List[int]] = []
    pattern: str = Field(..., min_length=5)

class MockTestResponse(BaseModel):
    test_content: str

class SuggestionsResponse(BaseModel):
    questions: List[str]