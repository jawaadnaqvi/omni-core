import os
import shutil
import uuid
import logging
from fastapi import UploadFile, HTTPException
from sqlalchemy.orm import Session
from pypdf import PdfReader

from app.core.database import SessionLocal
from app.modules.auth.models import User
from .models import Note, Document, DocumentChunk, Collection
from app.shared.embeddings import get_embedding
from . import schemas

logger = logging.getLogger(__name__)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# ==========================================
# COLLECTION SERVICES
# ==========================================
def create_collection(db: Session, collection: schemas.CollectionCreate, current_user: User) -> Collection:
    new_collection = Collection(
        name=collection.name,
        description=collection.description,
        user_id=current_user.id
    )
    db.add(new_collection)
    db.commit()
    db.refresh(new_collection)
    return new_collection

def get_user_collections(db: Session, current_user: User) -> list[Collection]:
    return db.query(Collection).filter(Collection.user_id == current_user.id).all()


# ==========================================
# BACKGROUND TASK (Smart Chunking & Embeddings)
# ==========================================
def process_embeddings_background(text: str, note_id: int):
    print(f"\n🚀 DEBUG: Background task STARTED for Note ID: {note_id}")
    db = SessionLocal()
    try:
        # 1. Smart Chunking: Paragraphs ke hisaab se todna (1000 chars tak)
        paragraphs = text.split("\n\n")
        chunks = []
        current_chunk = ""
        
        for para in paragraphs:
            if len(current_chunk) + len(para) < 1000:
                current_chunk += para + "\n\n"
            else:
                if current_chunk.strip():
                    chunks.append(current_chunk.strip())
                current_chunk = para + "\n\n"
        
        if current_chunk.strip():
            chunks.append(current_chunk.strip())

        # Fallback agar text mein paragraphs nahi hain (Single block text)
        if len(chunks) == 0:
            chunk_size = 500
            chunks = [text[i:i+chunk_size] for i in range(0, len(text), chunk_size)]

        print(f"📦 DEBUG: Total chunks to process: {len(chunks)}")
        saved_chunks = 0
        
        for chunk in chunks:
            if not chunk.strip():
                continue
            try:
                vector = get_embedding(chunk)
                new_chunk = DocumentChunk(
                    content=chunk,
                    embedding=vector,
                    note_id=note_id
                )
                db.add(new_chunk)
                saved_chunks += 1
                print(f"✅ DEBUG: Saved chunk {saved_chunks}/{len(chunks)}")
            except Exception as e:
                print(f"❌ DEBUG: Embedding API failed for a chunk: {str(e)}")
                continue
                
        db.commit()
        print(f"🏁 DEBUG: FINISHED! Successfully saved {saved_chunks} chunks for Note ID: {note_id}\n")
    except Exception as e:
        print(f"❌ DEBUG: Background task CRASHED: {str(e)}\n")
    finally:
        db.close()


# ==========================================
# NOTE SERVICES
# ==========================================
def create_note(db: Session, note: schemas.NoteCreate, current_user: User) -> Note:
    new_note = Note(
        title=note.title,
        content=note.content,
        user_id=current_user.id,
        collection_id=note.collection_id
    )
    db.add(new_note)
    db.commit()
    db.refresh(new_note)
    return new_note

def get_user_notes(db: Session, current_user: User) -> list[Note]:
    return db.query(Note).filter(Note.user_id == current_user.id).all()


def process_and_save_document(db: Session, file: UploadFile, note_id: int, current_user: User) -> Document:
    # 1. Security Check
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or unauthorized.")

    # 2. Secure Filename
    file_extension = os.path.splitext(file.filename)[1].lower()
    if file_extension not in [".pdf", ".txt"]:
        raise HTTPException(status_code=400, detail="Only PDF and TXT files are allowed.")
        
    secure_filename = f"{uuid.uuid4()}{file_extension}"
    file_location = os.path.join(UPLOAD_DIR, secure_filename)

    # 3. Save File to Disk
    try:
        with open(file_location, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"File save failed: {str(e)}")

    # 4. Extract Text
    extracted_text = ""
    if file_extension == ".pdf":
        try:
            reader = PdfReader(file_location)
            for page in reader.pages:
                text = page.extract_text()
                if text:
                    extracted_text += text + "\n\n" 
        except Exception as e:
            logger.error(f"PDF reading error: {e}")
            extracted_text = "" # Bug Fix: Error ki jagah khali string return karein
    elif file_extension == ".txt":
        try:
            with open(file_location, "r", encoding="utf-8") as f:
                extracted_text = f.read()
        except Exception as e:
            logger.error(f"TXT reading error: {e}")
            extracted_text = "" # Bug Fix: Error ki jagah khali string return karein

    # 5. Save Document Record
    new_doc = Document(
        file_name=file.filename,
        file_path=file_location,
        extracted_text=extracted_text.strip(),
        note_id=note_id
    )
    db.add(new_doc)
    db.commit()
    db.refresh(new_doc)

    return new_doc

def delete_note(db: Session, note_id: int, current_user: User):
    note = db.query(Note).filter(Note.id == note_id, Note.user_id == current_user.id).first()
    if not note:
        raise HTTPException(status_code=404, detail="Note not found or unauthorized")
    db.delete(note)
    db.commit()

def delete_collection(db: Session, collection_id: int, current_user: User):
    col = db.query(Collection).filter(Collection.id == collection_id, Collection.user_id == current_user.id).first()
    if not col:
        raise HTTPException(status_code=404, detail="Collection not found or unauthorized")
    db.delete(col)
    db.commit()