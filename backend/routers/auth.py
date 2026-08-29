from fastapi import APIRouter, Depends
from typing import Dict, Any
from core.security import get_current_user
from core.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.get("/me")
async def get_current_user_profile(user: Dict[str, Any] = Depends(get_current_user)):
    """Return the authenticated user identity and claims."""
    return {
        "status": "authenticated",
        "user": user,
        "projectId": settings.FIREBASE_PROJECT_ID
    }

@router.get("/status")
async def get_auth_system_status():
    """Return configuration status of Firebase Auth & Firestore."""
    return {
        "firebaseProjectId": settings.FIREBASE_PROJECT_ID,
        "authType": "Firebase Service Account OAuth 2.0",
        "dataIsolation": "Strict Per-User Namespaces",
        "status": "operational"
    }
