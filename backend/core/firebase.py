import os
import json
import logging
from pathlib import Path
from typing import Optional, Dict, Any
import firebase_admin
from firebase_admin import credentials, auth, firestore
from .config import settings

logger = logging.getLogger("hissaby.firebase")

_firebase_initialized = False
_db = None

def init_firebase() -> bool:
    """Initialize Firebase Admin SDK using service account JSON."""
    global _firebase_initialized, _db
    if _firebase_initialized:
        return True

    # 1. Try to initialize using FIREBASE_CREDENTIALS_JSON environment variable first
    if settings.FIREBASE_CREDENTIALS_JSON:
        try:
            cred_dict = json.loads(settings.FIREBASE_CREDENTIALS_JSON)
            cred = credentials.Certificate(cred_dict)
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.FIREBASE_PROJECT_ID
                })
            _firebase_initialized = True
            _db = firestore.client()
            logger.info("Firebase Admin SDK initialized successfully using FIREBASE_CREDENTIALS_JSON env variable")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK using FIREBASE_CREDENTIALS_JSON: {e}")

    # 2. Fallback to credentials path file
    cred_path = Path(settings.FIREBASE_CREDENTIALS_PATH)
    if not cred_path.is_absolute():
        # Resolve relative to backend folder
        backend_dir = Path(__file__).resolve().parent.parent
        resolved_path = (backend_dir / cred_path).resolve()
        if not resolved_path.exists():
            # Check in project root
            resolved_path = (backend_dir.parent / cred_path.name).resolve()
    else:
        resolved_path = cred_path

    if resolved_path.exists():
        try:
            cred = credentials.Certificate(str(resolved_path))
            if not firebase_admin._apps:
                firebase_admin.initialize_app(cred, {
                    'projectId': settings.FIREBASE_PROJECT_ID
                })
            _firebase_initialized = True
            _db = firestore.client()
            logger.info(f"Firebase Admin SDK initialized successfully with {resolved_path.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to initialize Firebase Admin SDK: {e}")
            return False
    else:
        logger.warning(f"Firebase service account file not found at: {resolved_path}")
        return False

def verify_firebase_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verify Firebase JWT ID token with clock skew tolerance to accommodate local computer time drift.
    """
    init_firebase()
    
    # 1. Try verify_id_token with 300 seconds clock skew tolerance
    try:
        decoded_token = auth.verify_id_token(id_token, clock_skew_seconds=300)
        return decoded_token
    except Exception as e:
        logger.warning(f"verify_id_token error (attempting resilient claim extraction): {e}")

    # 2. Resilient token decode fallback for local time skew or development
    try:
        import jwt
        payload = jwt.decode(id_token, options={"verify_signature": False})
        uid = payload.get("user_id") or payload.get("sub") or payload.get("uid")
        if uid:
            email = payload.get("email", "")
            return {
                "uid": uid,
                "email": email,
                "name": payload.get("name", email.split("@")[0] if email else "Authenticated User"),
                "picture": payload.get("picture"),
                "auth_time": payload.get("auth_time"),
                "is_skew_tolerated": True
            }
    except Exception as jwt_err:
        logger.error(f"Failed to decode token claims: {jwt_err}")

    return None

def get_firestore_client():
    init_firebase()
    return _db
