import logging
from sqlalchemy.orm import Session
from typing import List, Optional
from app.shared.llm_router import generate_ai_response
from app.modules.auth.models import User
from app.modules.notes.models import DocumentChunk, Note
from app.shared.embeddings import get_embedding
from .models import ChatMessage

logger = logging.getLogger(__name__)

# Minimum similarity threshold for vector search
DISTANCE_THRESHOLD = 0.5 

def save_message(db: Session, user_id: int, role: str, content: str, note_id: Optional[int] = None):
    """
    Saves a chat message to the database.
    If note_id is provided, it's saved as a targeted chat; otherwise, general chat.
    """
    msg = ChatMessage(user_id=user_id, role=role, content=content, note_id=note_id)
    db.add(msg)
    db.commit()

def get_chat_history(db: Session, current_user: User, note_id: Optional[int] = None) -> List[ChatMessage]:
    """
    Fetches chat history. 
    Filters by note_id to separate general AI Tutor chat from specific PDF chat.
    """
    query = db.query(ChatMessage).filter(ChatMessage.user_id == current_user.id)
    
    if note_id:
        # Fetch history for a specific PDF
        query = query.filter(ChatMessage.note_id == note_id)
    else:
        # Fetch history for general AI Tutor (where note_id is null)
        query = query.filter(ChatMessage.note_id == None)
        
    return query.order_by(ChatMessage.created_at.asc()).all()

def get_ai_reply(prompt: str, db: Session, current_user: User, note_id: Optional[int] = None) -> str:
    """
    Core RAG function. Searches the vector DB and generates a response.
    """
    try:
        # 1. Convert the prompt to a vector
        query_vector = get_embedding(prompt)
    except Exception as e:
        logger.error(f"❌ Query embedding failed: {e}")
        raise Exception(f"Embedding API Error: {str(e)}")

    try:
        # 2. Search for similar chunks
        distance_calculation = DocumentChunk.embedding.cosine_distance(query_vector)
        
        # Base query: restrict to current user's notes
        query = db.query(DocumentChunk).join(Note, DocumentChunk.note_id == Note.id).filter(Note.user_id == current_user.id)
        
        # TARGETED MODE: If a specific note is selected, restrict search to that document only
        if note_id:
            query = query.filter(Note.id == note_id)
            
        # Get top 4 most relevant chunks
        similar_chunks = (
            query.filter(distance_calculation < DISTANCE_THRESHOLD)
            .order_by(distance_calculation)
            .limit(4)
            .all()
        )
    except Exception as e:
        logger.error(f"❌ Vector search failed: {e}")
        return "Sorry, I couldn't search your notes right now."

    # Fallback if no relevant information is found
    if not similar_chunks:
        logger.info(f"🔍 No relevant chunks found for query: '{prompt}'")
        answer = "Mujhe aapki saved notes mein is sawal ka jawab nahi mila."
        save_message(db, current_user.id, "user", prompt, note_id)
        save_message(db, current_user.id, "assistant", answer, note_id)
        return answer

    # Build context from chunks
    context_parts = [chunk.content for chunk in similar_chunks]
    context = "\n---\n".join(context_parts)

    logger.info(f"🧠 Sending {len(similar_chunks)} relevant chunks to AI.")
    
    # 3. Generate answer using LLM
    answer = generate_ai_response(prompt=prompt, context=context)

    # 4. Save the conversation
    save_message(db, current_user.id, "user", prompt, note_id)
    save_message(db, current_user.id, "assistant", answer, note_id)

    return answer

def generate_suggestions(db: Session, current_user: User, note_id: int) -> List[str]:
    """
    Generates sample questions based on the first few chunks of a specific document.
    """
    chunks = db.query(DocumentChunk).join(Note, DocumentChunk.note_id == Note.id).filter(
        Note.id == note_id, Note.user_id == current_user.id
    ).limit(2).all()

    if not chunks:
        return ["What is this document about?", "Summarize the main points.", "What are the key takeaways?"]

    context = "\n".join([c.content for c in chunks])
    prompt = "Based on this text, generate exactly 3 short, relevant questions a student might ask. Return ONLY the questions, separated by newlines, no numbering."
    
    try:
        response = generate_ai_response(prompt=prompt, context=context)
        questions = [q.strip() for q in response.split("\n") if q.strip()]
        return questions[:3]
    except Exception as e:
        logger.error(f"Failed to generate suggestions: {e}")
        return ["What are the key concepts here?", "Explain the main idea."]

def generate_mock_test(db: Session, current_user: User, pattern: str, book_id: Optional[int] = None, note_ids: List[int] = []) -> str:
    """
    Generates a mock exam based on selected books or specific chapters.
    """
    query = db.query(DocumentChunk).join(Note, DocumentChunk.note_id == Note.id).filter(Note.user_id == current_user.id)
    
    if note_ids:
        query = query.filter(Note.id.in_(note_ids))
    elif book_id:
        query = query.filter(Note.collection_id == book_id)
        
    chunks = query.limit(30).all() 
    
    if not chunks:
        return "Mujhe is selection mein koi data nahi mila. Please make sure aapne PDFs upload ki hain."

    context = "\n---\n".join([c.content for c in chunks])
    
    system_prompt = (
        "You are an expert university professor. Based on the provided study material, "
        f"generate a professional mock exam strictly following this pattern: {pattern}. "
        "Format the output beautifully using Markdown. Do NOT include answers in the main section. "
        "At the very end, provide a separate 'Answer Key' section."
    )
    
    return generate_ai_response(prompt=system_prompt, context=context)