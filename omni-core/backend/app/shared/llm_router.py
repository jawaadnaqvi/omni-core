import logging
from fastapi import HTTPException, status
from litellm import completion
from google import genai
from app.core.config import settings

logger = logging.getLogger(__name__)

def generate_ai_response(prompt: str, context: str = "") -> str:
    # STRICT System Prompt (Hallucination rokne ke liye)
    system_message = (
        "You are Omni Core AI, a helpful personal knowledge assistant. "
        "Answer the user's question based STRICTLY on the provided context below. "
        "Do NOT use outside knowledge. If the answer is not explicitly in the context, "
        "you must reply exactly with: 'I could not find this information in your uploaded documents.'"
    )
    full_prompt = f"Context:\n{context}\n\nQuestion: {prompt}"

    # 1. PRIMARY: Groq
    if settings.GROQ_API_KEY:
        try:
            logger.info("🤖 Attempting generation with Groq...")
            response = completion(
                model="groq/openai/gpt-oss-120b",
                messages=[
                    {"role": "system", "content": system_message},
                    {"role": "user", "content": full_prompt}
                ],
                api_key=settings.GROQ_API_KEY,
                timeout=15
            )
            answer = response.choices[0].message.content
            logger.info("✅ Success with Groq")
            return answer
        except Exception as e:
            logger.warning(f"❌ Groq failed: {str(e).split('\n')[0]}. Switching to Gemini...")

    # 2. FALLBACK: Gemini
    if settings.GEMINI_API_KEY:
        try:
            logger.info("🤖 Attempting generation with Gemini...")
            client = genai.Client(api_key=settings.GEMINI_API_KEY)
            response = client.models.generate_content(
                model="gemini-3.8-flash",
                contents=f"{system_message}\n\n{full_prompt}"
            )
            answer = response.text
            logger.info("✅ Success with Gemini")
            return answer
        except Exception as e:
            logger.error(f"❌ Gemini failed: {str(e).split('\n')[0]}")

    logger.critical("🚨 All AI providers exhausted or unavailable.")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="All AI providers are currently unavailable. Please try again later."
    )