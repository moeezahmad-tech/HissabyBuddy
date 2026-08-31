# Hissaby Buddy — Smart AI Financial Copilot & Budget Manager

<p align="center">
  <img src="frontend/public/logo.png" alt="Hissaby Buddy Logo" width="120" height="120" style="border-radius: 24px; box-shadow: 0 10px 30px rgba(83, 145, 254, 0.2);" />
</p>

<p align="center">
  <strong>Autonomous Multi-Currency Personal & Enterprise Financial Copilot</strong><br/>
  Powered by <strong>FastAPI</strong>, <strong>React 19</strong>, <strong>Groq LLaMA-3.3-70B</strong>, <strong>Pinecone Vector DB</strong>, and <strong>Firebase Auth</strong>.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black" alt="React 19" />
  <img src="https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Groq-LLaMA--3.3--70B-F55036?logo=groq&logoColor=white" alt="Groq AI" />
  <img src="https://img.shields.io/badge/Pinecone-Vector_RAG-000000?logo=pinecone&logoColor=white" alt="Pinecone" />
  <img src="https://img.shields.io/badge/TailwindCSS-v4.0-38B2AC?logo=tailwindcss&logoColor=white" alt="Tailwind v4" />
  <img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License MIT" />
</p>

---

## 🌟 Executive Summary

**Hissaby Buddy** is an intelligent personal and business financial copilot designed to automate money management. It combines computer vision OCR for bank statements, vector semantic retrieval (Pinecone RAG), instant natural-language transaction logging, fixed recurring obligation tracking (Rent, Salary, Pocket Money), and high-velocity financial analytics into a clean white aesthetic.

---

## 🎨 Design Philosophy & Brand Tokens

The interface follows a tailored, ultra-clean white design with distinct contrast and micro-interactions:

- **Primary Color:** `#5391FE` (Vibrant Brand Blue) — used for interactive elements, badges, charts, and active states.
- **Secondary Color:** `#012456` (Deep Navy) — used for bold headings, branding, and major action anchors.
- **Background:** `#FFFFFF` & `#F8FAFC` — pristine white canvas with soft structural dividers (`#E2E8F0`).
- **Typography:** Modern responsive sans-serif with high readability, tabular numerals for currency, and clean hierarchy.

---

## 🚀 Key Feature Modules

### 1. 📊 Financial Analytics Dashboard
- **Key Performance Indicators (KPIs):** Real-time Total Balance, Monthly Spending, and Net Monthly Savings (`Inflow - Outflow` with percentage saved).
- **Dual Visual Velocity Charts:**
  - *Day-Wise Activity:* 7-day comparative income vs expense bars with animated hover inspection.
  - *Monthly Spending Trends:* Real-time category allocation curves against budget caps.
- **Recent Transactions Ledger:** Categorized financial stream auto-synchronized with verified OCR imports.
- **Quick Natural Language & Salary Modal:** One-click modal to log manual entries or paste conversational text like *"Paid 4500 for groceries at Metro"* parsed by Groq AI.

### 2. 🔁 Recurring Money Manager (`/recurring`)
- **Automated Fixed Commitments:** Add, track, and schedule recurring expenses and income:
  - 🏠 **House / Office Rent** (1st of month)
  - 💼 **Monthly Salary** (1st or 5th)
  - 💵 **Pocket Money / Allowance** (5th)
  - ⚡ **Electricity & Utility Bills** (10th)
  - 📶 **Internet / Wi-Fi** (15th)
  - 📱 **Mobile Postpaid Bills** (20th)
  - 🏫 **School / College Tuition Fees**
  - 🚗 **Car / Bike Installments**
  - 📺 **SaaS & Streaming Subscriptions**
- **Due Date Countdown:** Visual alerts for items `Due Today!`, `Due in 3 days`, or overdue.
- **1-Click Post to Ledger:** Automatically records due obligations into the verified transaction ledger without manual retyping.
- **Summary Metrics:** Total Monthly Outflow, Total Monthly Inflow, Net Recurring Surplus.

### 3. 👥 Collaborative Shared Groups & Teams (`/teams`)
- **Combined settings page**: Restructured group settings into a single top-to-bottom layout with info overview, budget cap updates, payment mode selectors, member invites, and Danger Zone sections.
- **SQL & SMTP invitations**: Send email invitations using custom database tokens. Invited members automatically join the shared group ledger upon login.
- **Dynamic budget cap updates**: Update budget limits with apply modes (permanently, current month, or next month) to ensure entire team alignment.
- **Automated payment alerts**: Notify members on split bill shares instantly via SMTP email alerts upon transaction log.
- **Temporary quick splits**: Toggle groups as temporary quick groups (e.g. for dinner hangouts, trips, or utility split bills).
- **Payment Modes**: Choose between Equal Split, Single Payer (NGO / sponsor pays all), or Custom Percentage contributions.

### 4. 🤖 AI Financial Assistant (Groq Copilot)
- **Zero-Latency Inference:** Powered by Groq Cloud LPU acceleration running **LLaMA-3.3-70B**.
- **Pinecone Vector RAG:** Answers questions grounded in real text chunks extracted from uploaded bank statements, tax documents, and receipts.
- **Live Ledger Awareness:** Copilot knows your current liquid balance, recurring commitments, and recent transactions.
- **Local Persistence:** Conversation history persists across browser reloads via `localStorage`.

### 5. 📄 Smart Document Ingestion & OCR
- **Multi-Format Support:** PDF statements, CSV ledgers, TXT, PNG, and JPG receipts.
- **Hybrid OCR Pipeline:** Combines PyMuPDF, EasyOCR, and Groq Vision for entity extraction (Payee, Purpose, Amount, Currency, Date).
- **Automatic Vectorization:** Chunks text and upserts 384-dimensional embeddings into Pinecone vector storage.

### 6. 🌍 Universal Multi-Currency Engine
- Instant global currency switching across all components, charts, KPI cards, and modals:
  - 🇵🇰 **PKR** (`Rs `)
  - 🇺🇸 **USD** (`$`)
  - 🇪🇺 **EUR** (`€`)
  - 🇬🇧 **GBP** (`£`)
  - 🇦🇪 **AED** (`AED `)
  - 🇸🇦 **SAR** (`SAR `)
  - 🇮🇳 **INR** (`₹`)
  - 🇨🇦 **CAD** (`C$`)

---

## 🛠 Tech Stack Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    REACT 19 FRONTEND                        │
│   Vite • TypeScript • Tailwind CSS v4 • Lucide React Icons  │
│   Dual-layer localStorage cache • Firebase Client Auth      │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST API (JSON / FormData)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    FASTAPI BACKEND (Python)                 │
│   Uvicorn • Pydantic v2 • StorageService (JSON Disk Store)  │
│   OCR Pipeline (EasyOCR / PyMuPDF) • Firebase Admin SDK     │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
┌──────────────────────────────┐ ┌────────────────────────────┐
│      GROQ CLOUD AI           │ │    PINECONE VECTOR DB      │
│  LLaMA-3.3-70B Text & Vision │ │  384-dim semantic chunks   │
└──────────────────────────────┘ └────────────────────────────┘
```

---

## 📂 Repository Directory Layout

```text
HissabyBuddy/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Automated Frontend & Backend CI pipeline
├── backend/
│   ├── core/
│   │   ├── config.py              # Centralized environment settings
│   │   ├── firebase.py            # Firebase Admin SDK & token validation
│   │   └── security.py            # JWT Auth & guest user resolution
│   ├── data/
│   │   └── hissaby_store.json     # Persistent disk storage (Ledgers, Recurring, Docs)
│   ├── routers/
│   │   ├── auth.py                # Authentication endpoints
│   │   ├── chat.py                # Groq AI copilot RAG endpoint
│   │   ├── dashboard.py           # Metrics, Charts, Recurring & Ledger API
│   │   └── documents.py           # Document upload, OCR & Pinecone upsert
│   ├── services/
│   │   ├── groq_service.py        # Groq LLaMA-3 client wrapper
│   │   ├── ocr_service.py         # EasyOCR & PDF financial parsing
│   │   ├── pinecone_service.py    # Pinecone vector indexing & retrieval
│   │   └── storage_service.py     # Local JSON disk persistence manager
│   ├── main.py                    # FastAPI application entrypoint & CORS
│   └── requirements.txt           # Python dependencies
├── frontend/
│   ├── public/
│   │   └── logo.png               # Official Hissaby Buddy logo asset
│   ├── src/
│   │   ├── components/
│   │   │   ├── AIFinancialAssistantView.tsx  # Groq AI chat view
│   │   │   ├── AllTransactionsModal.tsx      # Full ledger & CSV export modal
│   │   │   ├── AppView.tsx                   # App navigation router
│   │   │   ├── CurrencySelector.tsx          # Currency switcher dropdown
│   │   │   ├── DailySpendingChart.tsx        # 7-day activity bar chart
│   │   │   ├── DashboardView.tsx             # Main analytics dashboard
│   │   │   ├── DocumentUploadView.tsx        # Statement upload & OCR view
│   │   │   ├── Header.tsx                    # Top bar with currency & profile
│   │   │   ├── KPICards.tsx                  # Balance, Spend & Net Savings cards
│   │   │   ├── QuickTransactionModal.tsx     # Add transaction modal
│   │   │   ├── RecentTransactionsTable.tsx   # Ledger table with badges
│   │   │   ├── RecurringMoneyView.tsx        # Rent, Salary & Bills manager
│   │   │   ├── SidebarNavigation.tsx         # Sidebar navigation with logo
│   │   │   └── SpendingTrendsChart.tsx       # Monthly categories breakdown
│   │   ├── context/
│   │   │   ├── AuthContext.tsx               # Firebase authentication context
│   │   │   └── CurrencyContext.tsx           # Multi-currency provider & formatting
│   │   ├── services/
│   │   │   └── firebase.ts                   # Firebase Web SDK initialization
│   │   ├── App.tsx                           # Root React application component
│   │   ├── index.css                         # Tailwind CSS v4 design tokens
│   │   └── main.tsx                          # Vite client entrypoint
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── .env.example                   # Master environment variables template
├── .gitignore                     # Git ignore rules for Python & Node
└── README.md                      # Project documentation
```

---

## ⚡ Quickstart Guide

### Prerequisites
- **Node.js**: v18.0 or higher
- **Python**: v3.10 to v3.12
- **Groq API Key**: (Free at [console.groq.com](https://console.groq.com))
- **Pinecone API Key**: (Free at [app.pinecone.io](https://app.pinecone.io))

---

### Step 1: Clone Repository
```bash
git clone https://github.com/your-username/HissabyBuddy.git
cd HissabyBuddy
```

---

### Step 2: Configure Environment Variables
Copy the master `.env.example` file to both `backend/.env` and `frontend/.env`:

```bash
# 1. Setup Backend Environment
cp .env.example backend/.env

# 2. Setup Frontend Environment
cp .env.example frontend/.env
```

Open `backend/.env` and fill in your keys:
```env
GROQ_API_KEY=gsk_your_groq_api_key
PINECONE_API_KEY=pcsk_your_pinecone_api_key
PINECONE_INDEX_NAME=vectors
API_PORT=8000
FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development
```

---

### Step 3: Start FastAPI Backend
```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
.\venv\Scripts\activate
# On Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Launch FastAPI development server
uvicorn main:app --reload --port 8000
```
*Backend API will be running at `http://127.0.0.1:8000` (Interactive docs at `http://127.0.0.1:8000/docs`).*

---

### Step 4: Start React Frontend
In a separate terminal:

```bash
cd frontend

# Install packages
npm install

# Start Vite dev server
npm run dev
```
*Frontend will open at `http://localhost:5173`.*

---

## 🔒 Security & Data Isolation
- **Authentication:** Firebase ID token verification with strict bearer authentication.
- **Guest / Dev Mode Isolation:** Requests without tokens default to isolated `guest_user` storage.
- **Zero Raw PII Storage:** Sensitive bank account credentials are never stored. Only sanitized financial metrics and semantic text chunks are indexed.
- **Disk Synchronization:** All transaction modifications are written safely via atomic temporary file replacement (`hissaby_store.json.tmp` &rarr; `hissaby_store.json`).

---

## 🌐 Public Information Pages & Support Desk

We have introduced new public routing directories for visitors:
* 📄 **About Us Page (`/about`):** Detailed narrative of Hissaby Buddy's mission, pillars, and story.
* 🛠 **Created by TechKreative Page (`/techkreative`):** Introduces TechKreative as the developing agency with outbound links to [techkreative.com](https://techkreative.com).
* ✉️ **Contact Support Form (`/contact`):** A responsive form that allows users to submit support tickets. Upon submission, the backend triggers an automated SMTP email to **`team@techkreative.com`** detailing the user's name, email, subject, and message.

---

## 📄 License
This project is licensed under the **MIT License** — feel free to use and customize for personal or commercial projects.
