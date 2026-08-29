import logging
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, List
from core.security import get_current_user
from services.groq_service import groq_service
from services.pinecone_service import pinecone_service
from services.storage_service import storage_service

logger = logging.getLogger("hisaaby.chat")
router = APIRouter(prefix="/api/chat", tags=["Groq AI Copilot"])

class ChatRequest(BaseModel):
    prompt: str = Field(..., min_length=1, max_length=2000, description="Financial query or statement question")
    rag_context: Optional[str] = Field(None, max_length=5000, description="Optional custom context")
    history: Optional[List[Dict[str, str]]] = Field(None, description="Previous messages in current chat session")

class ChatResponse(BaseModel):
    response: str
    model: str = "Groq LLaMA-3.3-70B"
    user_uid: str
    documentsCount: int
    pineconeMatchesCount: int

@router.post("/ask", response_model=ChatResponse)
async def ask_financial_copilot(
    request: ChatRequest,
    user: Dict[str, Any] = Depends(get_current_user)
):
    """
    Query the Hisaaby Buddy financial copilot powered by Groq AI.
    Grounds answers in real Pinecone vector chunks, uploaded statement metadata, and live ledger data.
    """
    clean_prompt = request.prompt.strip()
    if not clean_prompt:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Prompt cannot be empty or solely whitespace."
        )

    uid = user.get("uid", "anonymous")

    # 1. Fetch user's uploaded documents from persistent storage
    user_docs = storage_service.get_documents(uid)
    docs_summary = f"Total Uploaded Documents: {len(user_docs)}\n"
    for d in user_docs:
        docs_summary += f"- {d.get('name')} ({d.get('type')}, {d.get('size')}, Status: {d.get('status')})\n"

    # 2. Fetch user's live balance, currency and recent ledger items
    user_balance = storage_service.get_balance(uid)
    user_txs = storage_service.get_transactions(uid)
    curr, sym = storage_service.get_currency(uid)
    ledger_summary = f"Current Account Balance: {sym}{user_balance:,.2f} ({curr})\n"
    ledger_summary += f"Recent Transactions Count: {len(user_txs)}\n"
    for tx in user_txs[:8]:
        tx_sym = tx.get("currencySymbol") or sym or "Rs "
        amt_str = f"+{tx_sym}{tx['amount']:,.2f}" if tx['amount'] > 0 else f"-{tx_sym}{abs(tx['amount']):,.2f}"
        ledger_summary += f"- {tx.get('date')}: {tx.get('name')} ({tx.get('category')}) {amt_str}\n"

    # 3. Query Pinecone Vector Database
    pinecone_chunks = pinecone_service.query_rag_context(uid=uid, query=clean_prompt, top_k=4)
    vector_summary = "\n\n".join(pinecone_chunks) if pinecone_chunks else "No specific vector text chunks matched this prompt."

    # 4. Construct complete grounded context
    full_rag_context = (
        f"=== UPLOADED DOCUMENTS ===\n{docs_summary}\n"
        f"=== LIVE LEDGER & BALANCE ===\n{ledger_summary}\n"
        f"=== RELEVANT PINECONE VECTOR CHUNKS ===\n{vector_summary}"
    )

    if request.rag_context:
        full_rag_context += f"\n=== ADDITIONAL CLIENT CONTEXT ===\n{request.rag_context}"

    try:
        ai_reply = groq_service.query_financial_assistant(
            prompt=clean_prompt,
            user_context=user,
            rag_context=full_rag_context,
            chat_history=request.history
        )

        return ChatResponse(
            response=ai_reply,
            model="Groq LLaMA-3.3-70B",
            user_uid=uid,
            documentsCount=len(user_docs),
            pineconeMatchesCount=len(pinecone_chunks)
        )
    except Exception as e:
        logger.error(f"Groq API error during financial query: {e}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq AI inference service encountered an issue: {str(e)}"
        )
