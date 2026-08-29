import logging
import json
from fastapi import FastAPI, Request, status, UploadFile, File, Depends
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.middleware.cors import CORSMiddleware
from core.config import settings
from core.firebase import init_firebase
from core.security import get_current_user
from routers import auth, chat, dashboard, documents
from services.ocr_service import (
    extract_financial_data_with_vlm,
    convert_vlm_data_to_transactions,
    extract_text_from_pdf,
    parse_financial_data
)
from services.pinecone_service import pinecone_service
from routers.dashboard import register_document_financials

# Configure logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("hissaby.api")

app = FastAPI(
    title="Hissaby Buddy API",
    description="Backend API for Hissaby Buddy - Groq Vision, Pinecone RAG & Firebase Auth",
    version="2.1.0"
)

# Global CORS Configuration
origins = [
    settings.FRONTEND_URL,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception Handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.warning(f"HTTP {exc.status_code} at {request.url.path}: {exc.detail}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status_code": exc.status_code,
            "error": exc.detail,
            "path": request.url.path
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.warning(f"Validation error at {request.url.path}: {exc.errors()}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "status_code": 422,
            "error": "Validation Error",
            "details": exc.errors(),
            "path": request.url.path
        }
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error at {request.url.path}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False,
            "status_code": 500,
            "error": "Internal Server Error",
            "message": "An unexpected error occurred. Please try again later.",
            "path": request.url.path
        }
    )

@app.on_event("startup")
async def on_startup():
    init_firebase()

# Mount API Routers
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(dashboard.router)
app.include_router(documents.router)

@app.get("/")
async def root():
    return {
        "app": "Hissaby Buddy API",
        "status": "operational",
        "version": "2.1.0",
        "features": [
            "Groq Multimodal Vision (95%+ Extraction Accuracy)",
            "Smart Document Upload & RAG (Pinecone)",
            "AI Financial Chat Assistant (Groq AI)",
            "Interactive Financial Dashboard",
            "Secure Authentication & Data Isolation (Firebase Auth)",
            "Structured Transaction & Budget Logging (Firestore)"
        ]
    }

@app.get("/api/ping")
async def ping_keepalive():
    return {"status": "alive", "service": "Hissaby Buddy API"}

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "environment": settings.ENVIRONMENT,
        "firebaseProjectId": settings.FIREBASE_PROJECT_ID,
        "groqConfigured": bool(settings.GROQ_API_KEY),
        "pineconeConfigured": bool(settings.PINECONE_API_KEY)
    }

# =========================================================================
# DEDICATED VLM RECEIPT SCANNING ROUTE
# =========================================================================
@app.post("/api/scan-receipt")
async def scan_receipt(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    """
    Multimodal Vision-Language extraction route for messy receipts, invoices, and handwritten 'hisab'.
    Preprocesses with OpenCV (grayscale, contrast, deskewing) and queries Groq Vision with JSON schema.
    """
    uid = user.get("uid", "anonymous")
    filename = file.filename or "receipt.jpg"
    content = await file.read()
    
    file_ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    vlm_result = None
    
    if file_ext in [".png", ".jpg", ".jpeg", ".webp"]:
        vlm_result = extract_financial_data_with_vlm(content, filename)
    elif file_ext == ".pdf":
        pdf_text = extract_text_from_pdf(content)
        txs, balance, vlm_result = parse_financial_data(pdf_text, filename)
    else:
        txs, balance, vlm_result = parse_financial_data(content.decode("utf-8", errors="ignore"), filename)

    if not vlm_result:
        return JSONResponse(
            status_code=400,
            content={"error": "Failed to extract structured financial data from document."}
        )

    txs, balance, ai_meta = convert_vlm_data_to_transactions(vlm_result, filename)
    
    # Sync to user ledger
    curr = ai_meta.get("currency", "PKR")
    sym = ai_meta.get("currency_symbol", "Rs " if curr == "PKR" else "$")
    register_document_financials(uid, filename, txs, balance, currency=curr, currency_symbol=sym)

    # Upsert vectors to Pinecone
    chunks = [
        f"Receipt: {filename} from {ai_meta.get('vendor') or ai_meta.get('payee')}. Total: {curr} {balance:,.2f}.",
        json.dumps(ai_meta)
    ]
    pinecone_service.upsert_document_chunks(uid, f"vlm_{filename}", filename, chunks)

    return {
        "status": "success",
        "message": f"Successfully scanned {filename} using Groq Vision.",
        "data": ai_meta,
        "transactionsCount": len(txs),
        "totalAmount": balance
    }
