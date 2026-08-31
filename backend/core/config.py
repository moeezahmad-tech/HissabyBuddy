import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env strictly from relative backend directory
base_dir = Path(__file__).resolve().parent.parent
backend_env = base_dir / ".env"

if backend_env.exists():
    load_dotenv(backend_env)

class Settings:
    # Neon Database Settings (from backend/.env)
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    DIRECT_URL: str = os.getenv("DIRECT_URL", "")
    NEON_PROJECT_ID: str = os.getenv("NEON_PROJECT_ID", "")
    NEON_ORG_ID: str = os.getenv("NEON_ORG_ID", "")

    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY") or os.getenv("GROQ") or ""
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")
    PINECONE_INDEX_NAME: str = os.getenv("PINECONE_INDEX_NAME", "vectors")
    
    FIREBASE_CREDENTIALS_PATH: str = os.getenv("FIREBASE_CREDENTIALS_PATH", "firebase-credentials.json")
    FIREBASE_CREDENTIALS_JSON: str = os.getenv("FIREBASE_CREDENTIALS_JSON", "")
    FIREBASE_PROJECT_ID: str = os.getenv("FIREBASE_PROJECT_ID", "finsight-ai-e692d")

    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")

    # Email SMTP & API configuration
    EMAIL_PASSWORD: str = os.getenv("EMAIL_PASSWORD", "")
    EMAIL_ID: str = os.getenv("EMAIL_ID", "")
    EMAIL_SMTP: str = os.getenv("EMAIL_SMTP", "")
    EMAIL_IMAP: str = os.getenv("EMAIL_IMAP", "")
    RESEND_API_KEY: str = os.getenv("RESEND_API_KEY", "")

settings = Settings()
