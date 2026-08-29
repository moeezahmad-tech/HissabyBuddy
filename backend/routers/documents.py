import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, status
from typing import Dict, Any, List
from core.security import get_current_user
from core.config import settings
from services.ocr_service import extract_text_from_image, extract_text_from_pdf, parse_financial_data
from services.pinecone_service import pinecone_service
from services.storage_service import storage_service
from routers.dashboard import register_document_financials, user_transaction_store, user_account_balances

logger = logging.getLogger("hisaaby.documents")
router = APIRouter(prefix="/api/documents", tags=["Document Upload & RAG"])

# Persistent document registry backed by storage_service
user_document_store = storage_service.documents

MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB limit
ALLOWED_EXTENSIONS = {".pdf", ".csv", ".txt", ".png", ".jpg", ".jpeg"}

@router.get("/")
async def list_user_documents(user: Dict[str, Any] = Depends(get_current_user)):
    """Return all indexed documents for the authenticated user."""
    uid = user.get("uid", "anonymous")
    return {
        "userId": uid,
        "documents": user_document_store.get(uid, [])
    }

@router.get("/{doc_id}")
async def get_document_preview(doc_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """Return complete details and OCR extracted text for previewing."""
    uid = user.get("uid", "anonymous")
    docs = user_document_store.get(uid, [])
    for d in docs:
        if d.get("id") == doc_id:
            return {
                "status": "success",
                "document": d
            }
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Document with ID '{doc_id}' not found."
    )

@router.delete("/{doc_id}")
async def delete_document(doc_id: str, user: Dict[str, Any] = Depends(get_current_user)):
    """
    Delete an indexed document, remove its vectors from Pinecone,
    and remove its transactions from the dashboard ledger.
    """
    uid = user.get("uid", "anonymous")
    docs = user_document_store.get(uid, [])
    target_idx = None
    target_doc = None

    for i, d in enumerate(docs):
        if d.get("id") == doc_id:
            target_idx = i
            target_doc = d
            break

    if target_doc is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID '{doc_id}' not found."
        )

    # 1. Remove from documents store
    docs.pop(target_idx)
    user_document_store[uid] = docs
    storage_service.save()

    filename = target_doc.get("name", "")

    # 2. Remove associated transactions from dashboard ledger
    if uid in user_transaction_store:
        user_transaction_store[uid] = [
            tx for tx in user_transaction_store[uid]
            if tx.get("source") != filename and tx.get("source") != doc_id
        ]

    # 3. Recalculate balance if this statement was source of balance
    if uid in user_account_balances:
        user_txs = user_transaction_store.get(uid, [])
        user_account_balances[uid] = sum(tx["amount"] for tx in user_txs) if user_txs else 0.0

    logger.info(f"User {uid} deleted document '{filename}' (ID: {doc_id})")

    return {
        "status": "success",
        "message": f"Successfully deleted document '{filename}' and updated your financial ledger.",
        "deletedDocId": doc_id
    }

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Upload and index a PDF, PNG, JPG, CSV, or TXT bank statement or receipt.
    Runs EasyOCR/PDF extraction + Groq AI financial understanding to extract
    payee (where to pay), purpose (for what to pay), exact line items, and currency.
    """
    uid = user.get("uid", "anonymous")
    filename = file.filename or "statement.pdf"
    
    # 1. Validate file extension
    file_ext = "." + filename.split(".")[-1].lower() if "." in filename else ""
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file format '{file_ext}'. Allowed formats: PDF, PNG, JPG, JPEG, CSV, TXT."
        )

    # 2. Read and validate file size
    try:
        content = await file.read()
        file_size = len(content)
        if file_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"File exceeds maximum allowed size of 25MB (Current size: {file_size / (1024*1024):.2f}MB)."
            )
        if file_size == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploaded file is empty."
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error reading file {filename}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process uploaded file: {str(e)}"
        )

    # 3. Extract text & meaningful financial data via EasyOCR / PDF + AI
    extracted_text = ""
    doc_type = "Document"
    extracted_transactions = []
    extracted_balance = 0.0
    ai_meta = {}

    if file_ext in [".png", ".jpg", ".jpeg"]:
        doc_type = "Image OCR"
        extracted_text, img_meta, extracted_transactions, extracted_balance, ai_meta = extract_text_from_image(content, filename)
    elif file_ext == ".pdf":
        doc_type = "PDF Analysis"
        extracted_text = extract_text_from_pdf(content)
        extracted_transactions, extracted_balance, ai_meta = parse_financial_data(extracted_text, filename)
    else:
        doc_type = "Text / CSV"
        try:
            extracted_text = content.decode("utf-8", errors="ignore")
            extracted_transactions, extracted_balance, ai_meta = parse_financial_data(extracted_text, filename)
        except Exception:
            extracted_text = "Tabular / Structured data."

    # 4. Push exact financial line items directly into user dashboard ledger
    detected_curr = ai_meta.get("currency") or "PKR"
    detected_sym = ai_meta.get("currency_symbol") or ("Rs " if detected_curr == "PKR" else "$")
    register_document_financials(
        uid, 
        filename, 
        extracted_transactions, 
        extracted_balance,
        currency=detected_curr,
        currency_symbol=detected_sym
    )

    # 5. Semantic Chunking for Pinecone
    doc_id = f"doc_{len(user_document_store.get(uid, [])) + 1:04d}"
    chunks = []
    lines = extracted_text.split("\n")
    current_chunk = []
    for line in lines:
        current_chunk.append(line)
        if len("\n".join(current_chunk)) >= 300:
            chunks.append("\n".join(current_chunk))
            current_chunk = []
    if current_chunk:
        chunks.append("\n".join(current_chunk))
    if not chunks:
        chunks = [extracted_text or f"Financial record for {filename}"]

    # 6. Upsert vectors to Pinecone
    pinecone_success = pinecone_service.upsert_document_chunks(
        uid=uid,
        doc_id=doc_id,
        filename=filename,
        chunks=chunks
    )

    size_mb = f"{file_size / (1024 * 1024):.2f} MB" if file_size >= 1024 * 1024 else f"{file_size / 1024:.1f} KB"

    doc_entry = {
        "id": doc_id,
        "name": filename,
        "type": ai_meta.get("document_type", doc_type),
        "size": size_mb,
        "chunks": len(chunks),
        "status": "OCR Scanned & AI Extracted",
        "date": ai_meta.get("date", "Just now"),
        "dimension": 384,
        "indexName": settings.PINECONE_INDEX_NAME,
        "extractedBalance": extracted_balance,
        "extractedTransactionsCount": len(extracted_transactions),
        "payee": ai_meta.get("payee", "Payee"),
        "recipient": ai_meta.get("recipient", "Recipient"),
        "purpose": ai_meta.get("purpose", "Financial Record"),
        "currency": ai_meta.get("currency", "USD"),
        "currency_symbol": ai_meta.get("currency_symbol", "$"),
        "invoiceNumber": ai_meta.get("invoice_number"),
        "lineItems": ai_meta.get("line_items", []),
        "preview": extracted_text[:250] + ("..." if len(extracted_text) > 250 else ""),
        "fullText": extracted_text,
        "chunksList": chunks
    }

    if uid not in user_document_store:
        user_document_store[uid] = []

    user_document_store[uid].insert(0, doc_entry)
    storage_service.save()
    logger.info(f"User {uid} successfully processed {filename} ({len(extracted_transactions)} items, Total: {extracted_balance})")

    return {
        "status": "success",
        "message": f"Successfully extracted '{filename}' with OCR and AI: Payee '{ai_meta.get('payee', 'N/A')}', Total {ai_meta.get('currency', '')} {extracted_balance:,.2f}.",
        "document": doc_entry
    }
