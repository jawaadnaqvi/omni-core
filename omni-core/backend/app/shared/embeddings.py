import logging
from google import genai
from google.genai import types  # 👈 YEH IMPORT ZAROORI HAI
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_embedding(text: str) -> list[float]:
    """Text ko vector (numbers) mein convert karta hai."""
    try:
        client = genai.Client(api_key=settings.GEMINI_API_KEY)
        result = client.models.embed_content(
            model="gemini-embedding-001",
            contents=text,
            config=types.EmbedContentConfig(output_dimensionality=768)  # 👈 YEH LINE ADD KAREIN
        )
        return result.embeddings[0].values
    except Exception as e:
        logger.error(f"❌ Embedding failed: {str(e)}")
        raise e