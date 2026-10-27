from fastapi import APIRouter, Depends, status, UploadFile, File, BackgroundTasks
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.modules.auth.router import get_current_user
from app.modules.auth.models import User
from . import schemas, service

router = APIRouter(
    prefix="/notes",
    tags=["Notes & Collections"]
)

# ==========================================
# COLLECTION ENDPOINTS
# ==========================================
@router.post(
    "/collections", 
    response_model=schemas.CollectionResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new collection"
)
def create_new_collection(
    collection: schemas.CollectionCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return service.create_collection(db=db, collection=collection, current_user=current_user)


@router.get(
    "/collections", 
    response_model=List[schemas.CollectionResponse],
    summary="Get all collections for current user"
)
def get_my_collections(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return service.get_user_collections(db=db, current_user=current_user)


@router.delete(
    "/collections/{collection_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a collection"
)
def delete_my_collection(
    collection_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service.delete_collection(db, collection_id, current_user)
    return None


# ==========================================
# NOTE ENDPOINTS
# ==========================================
@router.post(
    "/", 
    response_model=schemas.NoteResponse, 
    status_code=status.HTTP_201_CREATED,
    summary="Create a new note"
)
def create_new_note(
    note: schemas.NoteCreate, 
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return service.create_note(db=db, note=note, current_user=current_user)


@router.get(
    "/", 
    response_model=List[schemas.NoteResponse],
    summary="Get all notes for current user"
)
def get_my_notes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return service.get_user_notes(db=db, current_user=current_user)


@router.delete(
    "/{note_id}", 
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a note"
)
def delete_my_note(
    note_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service.delete_note(db, note_id, current_user)
    return None


@router.post(
    "/{note_id}/upload", 
    response_model=schemas.DocumentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload document to a note"
)
def upload_document_to_note(
    note_id: int,
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(..., description="Upload a PDF file"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    document = service.process_and_save_document(
        db=db, file=file, note_id=note_id, current_user=current_user
    )

    print(f"\n=== DEBUG ROUTER === File uploaded. Extracted Text Length: {len(document.extracted_text) if document.extracted_text else 0}")

    if document.extracted_text and len(document.extracted_text.strip()) > 10:
        print(f"=== DEBUG ROUTER === Adding background task for Note {note_id}")
        background_tasks.add_task(
            service.process_embeddings_background,
            text=document.extracted_text,
            note_id=note_id
        )
    else:
        print("=== DEBUG ROUTER === No text found. Background task SKIPPED.")

    return document

from app.modules.notes.models import Meeting
import uuid

@router.post("/meetings", response_model=schemas.MeetingResponse, status_code=status.HTTP_201_CREATED)
def create_meeting(
    meeting: schemas.MeetingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Ek unique Jitsi Room Name generate karein
    room_name = f"OmniCore-Class-{uuid.uuid4().hex[:8]}"
    
    new_meeting = Meeting(
        title=meeting.title,
        room_name=room_name,
        user_id=current_user.id
    )
    db.add(new_meeting)
    db.commit()
    db.refresh(new_meeting)
    return new_meeting

@router.get("/meetings", response_model=List[schemas.MeetingResponse])
def get_meetings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Meeting).filter(Meeting.user_id == current_user.id).order_by(Meeting.created_at.desc()).all()

# ==========================================
# NAYA: Delete Meeting Endpoint
# ==========================================
@router.delete(
    "/meetings/{meeting_id}", 
    status_code=status.HTTP_204_NO_CONTENT, 
    summary="Delete a meeting"
)
def delete_meeting(
    meeting_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Meeting ko delete karta hai. Sirf wohi user delete kar sakta hai jisne meeting banayi ho.
    """
    # Meeting dhoondein
    meeting = db.query(Meeting).filter(
        Meeting.id == meeting_id, 
        Meeting.user_id == current_user.id
    ).first()
    
    # Agar meeting nahi mili
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found or unauthorized")
        
    # Delete karein
    db.delete(meeting)
    db.commit()
    return None