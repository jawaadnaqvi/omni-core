from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
import logging

# Ye lines add karein taake saare INFO logs terminal par nazar aayein
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

# --- Models Import (Bohat Zaroori!) ---
# Ye imports lazmi hain taake Base.metadata.create_all ko saari tables ka pata chale
from app.modules.auth import models as auth_models
from app.modules.notes import models as notes_models

# --- Routers Import ---
from app.modules.auth.router import router as auth_router
from app.modules.notes.router import router as notes_router
from app.modules.ai.router import router as ai_router


# --- Application Lifespan (Startup & Shutdown Events) ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Database tables create karein agar exist nahi karti
    print("🚀 Starting Omni Core API...")
    
    # Ye line saari models (Users, Notes, Documents, Chunks) ki tables bana degi
    # Base.metadata.create_all(bind=engine)
    # print("✅ Database tables verified/created.")
    
    yield  # Yahan app run hoti hai
    
    # Shutdown: Clean up tasks
    print("🛑 Shutting down Omni Core API...")


# --- FastAPI App Initialization ---
app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Omni Core: AI-Powered Personal Knowledge Hub API. Built with FastAPI and PostgreSQL.",
    version="0.1.0",
    docs_url=f"{settings.API_V1_STR}/docs",
    openapi_tags=[
        {"name": "Authentication", "description": "User registration, login, and profile."},
        {"name": "Notes & Collections", "description": "Create notes, collections, and upload documents (PDF)."},
        {"name": "AI Chat", "description": "Interact with your knowledge base using AI (RAG)."}
    ],
    lifespan=lifespan
)


# --- CORS Middleware ---
# Frontend (Next.js) ko backend se connect hone ki ijazat deta hai
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Production mein isko frontend URL se replace karein
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# --- Routers Registration ---
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(notes_router, prefix=settings.API_V1_STR)
app.include_router(ai_router, prefix=settings.API_V1_STR)


# --- Base Endpoints ---
@app.get("/", tags=["Root"])
def read_root():
    """Root endpoint to verify API is running."""
    return {
        "status": "success",
        "message": f"Welcome to {settings.PROJECT_NAME} API 🚀"
    }

@app.get("/health", tags=["Health"])
def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "database": "connected",
        "version": "0.1.0"
    }