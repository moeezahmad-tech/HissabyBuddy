# Hisaaby Buddy - Backend API

> **FastAPI Backend for Groq AI Inference, Pinecone RAG & Firebase Auth**  
> High-performance Python backend powering Hisaaby Buddy financial intelligence.

---

## Overview

The Hisaaby Buddy backend provides:
- **Groq Cloud LPU Inference:** Instant responses powered by LLaMA-3 models for conversational budget forecasting and expenditure optimization.
- **Pinecone Vector Database:** High-dimensional vector storage (384-dimensional embeddings) for RAG over PDF bank statements and financial reports.
- **Firebase Admin SDK & JWT Auth:** Identity verification and per-user data tenancy enforcement using Google service account credentials.
- **Firestore Ledger Services:** Isolated transactional storage and category budget tracking.

---

## Architecture & Directory Layout

```
backend/
├── core/
│   ├── config.py           # Environment variables & runtime settings
│   ├── firebase.py         # Firebase Admin SDK & token verification
│   └── security.py         # FastAPI Depends(get_current_user) JWT Bearer auth
├── services/
│   └── groq_service.py     # Groq client with financial analyst system prompt
├── routers/
│   ├── auth.py             # /api/auth/me and system status
│   ├── chat.py             # /api/chat/ask (Groq AI copilot)
│   └── dashboard.py        # /api/dashboard/metrics, spending-trends, transactions
├── main.py                 # FastAPI application, CORS middleware, route mounting
├── requirnments.txt        # Python package dependencies
└── .env                    # Environment configuration
```

---

## Environment Variables Configuration

Create or update `backend/.env`:

```env
# Groq AI Cloud API Key
GROQ_API_KEY=your_groq_api_key_here

# Pinecone Serverless Vector Index
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=hisaaby-financial-rag

# Firebase Admin SDK Credentials
FIREBASE_CREDENTIALS_PATH=../finsight-ai-e692d-firebase-adminsdk-fbsvc-0c9b244ae3.json
FIREBASE_PROJECT_ID=finsight-ai-e692d

# Host & Client Integration
FRONTEND_URL=http://localhost:5173
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=development
```

---

## API Endpoints

### 1. Root & Health
- `GET /` - Service status and features overview
- `GET /health` - Health check validating Firebase, Groq, and Pinecone configuration

### 2. Authentication (`/api/auth`)
- `GET /api/auth/me` - Validates Bearer ID token and returns authenticated user claims
- `GET /api/auth/status` - Firebase tenancy & isolation status

### 3. AI Financial Copilot (`/api/chat`)
- `POST /api/chat/ask` - Send financial prompts and optional RAG context to Groq AI

```json
// Request Body
{
  "prompt": "What was my highest expense last month?",
  "rag_context": "Chase Statement July 2026: AWS Cloud Services $4,800.00"
}

// Response
{
  "response": "Based on your indexed statements, your largest expense was AWS Cloud Services ($4,800.00)...",
  "model": "Groq LLaMA-3.3-70B",
  "user_uid": "usr_89f02a_enterprise"
}
```

### 4. Dashboard Analytics (`/api/dashboard`)
- `GET /api/dashboard/metrics` - Total balance, monthly spending, and AI savings
- `GET /api/dashboard/spending-trends` - Categorized expenditure and monthly velocity
- `GET /api/dashboard/transactions` - Isolated transaction history

---

## Getting Started

### 1. Activate Virtual Environment
```bash
# Windows
.\venv\Scripts\activate
```

### 2. Install Requirements
```bash
pip install -r requirnments.txt
```

### 3. Run FastAPI Development Server
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Interactive Swagger API documentation is available at [http://localhost:8000/docs](http://localhost:8000/docs).
