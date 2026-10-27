from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.modules.auth.router import get_current_user
from app.modules.auth.models import User
from . import schemas, service

router = APIRouter(prefix="/ai", tags=["AI Chat & Mock Tests"])

@router.post("/chat", response_model=schemas.ChatResponse)
def chat_with_ai(
    request: schemas.ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Endpoint for standard and targeted AI chat.
    If note_id is provided in the request body, it targets that specific PDF.
    """
    try:
        reply = service.get_ai_reply(
            prompt=request.prompt, 
            db=db, 
            current_user=current_user, 
            note_id=request.note_id
        )
        return {"response": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/history", response_model=List[schemas.ChatMessageResponse])
def get_history(
    note_id: Optional[int] = Query(None, description="Filter history by specific note/PDF"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Fetches chat history. 
    If note_id is passed as a query parameter, returns only that PDF's chat.
    """
    return service.get_chat_history(db=db, current_user=current_user, note_id=note_id)

@router.get("/suggestions/{note_id}", response_model=schemas.SuggestionsResponse)
def get_suggestions(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates sample questions for a specific PDF.
    """
    try:
        questions = service.generate_suggestions(db, current_user, note_id)
        return {"questions": questions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/mock-test", response_model=schemas.MockTestResponse)
def create_mock_test(
    request: schemas.MockTestRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a mock exam based on the given pattern and selected books/chapters.
    """
    try:
        test = service.generate_mock_test(
            db=db, 
            current_user=current_user, 
            book_id=request.book_id, 
            note_ids=request.note_ids,
            pattern=request.pattern
        )
        return {"test_content": test}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))