import os
from pathlib import Path
from dotenv import load_dotenv

# Search for .env in current directory, parent directory, and backend directory
base_dir = Path(__file__).resolve().parent.parent
env_paths = [
    base_dir / ".env",
    base_dir.parent / ".env"
]

for p in env_paths:
    if p.exists():
        load_dotenv(p)
        break

class Settings:
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY") or os.getenv("GROQ") or ""
    PINECONE_API_KEY: str = (
        os.getenv("PINECONE_API_KEY") 
        or os.getenv("PINECODE_DEFAULT_KEY_FINSIGHT_AI") 
        or ""
    )
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "vectors")
    
    FIREBASE_CREDENTIALS_PATH: str = os.getenv(
        "FIREBASE_CREDENTIALS_PATH", 
        "../finsight-ai-e692d-firebase-adminsdk-fbsvc-0c9b244ae3.json"
    )
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "finsight-ai-e692d")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

settings = Settings()
