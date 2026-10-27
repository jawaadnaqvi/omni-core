import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import ProgrammingError

from app.core.config import settings

logger = logging.getLogger(__name__)

# 1. Database Engine Banayein
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,  # Connection drop hone par automatically reconnect karega
    pool_size=10,        # Ek waqt mein 10 connections
    max_overflow=20      # Zaroorat parne par 20 extra connections
)

# 2. Pgvector Extension Automatically Enable Karein
# Har naye database ke liye zaroori hai, warna 'vector' type error aayega
def enable_pgvector_extension():
    try:
        with engine.begin() as connection: # begin() automatically commit kar deta hai
            connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))
        logger.info("✅ pgvector extension enabled/verified.")
    except Exception as e:
        logger.error(f"❌ Failed to enable pgvector extension: {e}")

# Server start hote hi yeh function chalega
enable_pgvector_extension()


# 3. Session Local Setup
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 4. Base Class (Sabhi models isko inherit karte hain)
Base = declarative_base()

# 5. FastAPI Dependency (DB Session)
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()