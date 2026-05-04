from app.core.config import settings
import google.generativeai as genai

genai.configure(api_key=settings.GEMINI_API_KEY)

try:
    result = genai.embed_content(
        model="models/gemini-embedding-001",
        content="Hello world",
        task_type="retrieval_document"
    )
    print("Dimensions:", len(result['embedding']))
except Exception as e:
    print(e)
