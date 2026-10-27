import os
from dotenv import load_dotenv
from litellm import completion
from google import genai  # 👈 Naya SDK import

def main():
    load_dotenv()
    groq_key = os.getenv("GROQ_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")

    print("========================================")
    print("🔑 API KEYS STATUS")
    print(f"Groq Key Found:   {bool(groq_key)}")
    print(f"Gemini Key Found: {bool(gemini_key)}")
    print("========================================\n")

    # --- 1. Groq Test ---
    print("🤖 Testing Groq (LiteLLM)...")
    try:
        response = completion(
            model="groq/openai/gpt-oss-120b", 
            messages=[{"role": "user", "content": "Say 'Hello Omni Core!'"}],
            api_key=groq_key
        )
        print("✅ Groq Success:", response.choices[0].message.content.strip())
    except Exception as e:
        print("❌ Groq Failed:", str(e).split('\n')[0])

    print("-" * 50)

    # --- 2. Gemini Test (New Google GenAI SDK) ---
    print("🤖 Testing Gemini (Google GenAI SDK)...")
    try:
        # Naye SDK ke hisaab se client banayein
        client = genai.Client(api_key=gemini_key)
        
        # Naya stable model use karein jo error message mein bataya gaya tha
        response = client.models.generate_content(
            model="gemini-3.8-flash",
            contents="Say 'Hello Omni Core!'"
        )
        print("✅ Gemini Success:", response.text.strip())
        
    except Exception as e:
        print("❌ Gemini Failed:", str(e).split('\n')[0])

if __name__ == "__main__":
    main()