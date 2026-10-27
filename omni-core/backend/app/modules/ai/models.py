from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Role can be 'user' or 'assistant'
    role = Column(String, nullable=False)
    
    # Actual message content
    content = Column(Text, nullable=False)
    
    # Timestamp for ordering messages
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # NEW: Link message to a specific Note (PDF). 
    # If null, it's a general AI Tutor chat. If set, it's a Targeted PDF chat.
    note_id = Column(Integer, ForeignKey("notes.id", ondelete="CASCADE"), nullable=True) 

    # Relationships
    user = relationship("User", back_populates="chat_messages")
    note = relationship("Note", back_populates="chat_messages")