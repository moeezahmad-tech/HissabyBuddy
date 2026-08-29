# Hisaaby Buddy - Frontend Application

> **Next-Gen AI Financial Copilot & RAG Analytics Interface**  
> Built with React 19, TypeScript, Vite, and Tailwind CSS v4.

---

## Overview

**Hisaaby Buddy** is a modern, white-themed financial AI web application designed for high-precision wealth intelligence, Pinecone RAG document searching, and automated Firestore transaction ledgering.

### Color Palette & Design System
- **Primary Blue:** `#5391FE` (Interactive buttons, focus states, active pills)
- **Secondary Navy:** `#012456` (Headers, brand typography, badges)
- **Background:** `#FFFFFF` (Distraction-free pure white canvas)
- **Text:** `#000000` / slate grays for secondary labels
- **Theme:** Minimalist, enterprise-grade white theme with subtle slate borders (`#E2E8F0`).

---

## 7 Core Features Implemented

1. **Smart Document Upload & RAG**  
   Upload PDF bank statements or financial reports so the system can automatically read, chunk, and index them into Pinecone for semantic vector searching.
2. **AI Financial Chat Assistant**  
   Ask questions about your budget, spending habits, or uploaded financial documents and get instant, real-time answers powered by Groq AI.
3. **Interactive Financial Dashboard**  
   Track your finances using clean KPI summary cards, visual spending trend charts, and structured data views.
4. **Secure Authentication & Data Isolation**  
   Sign in securely using Firebase Auth to keep your financial records private and separated per user.
5. **Structured Transaction & Budget Logging**  
   Save, categorize, and manage your income, budgets, and transaction histories directly in Firebase Firestore.
6. **Custom Responsive Interface**  
   Navigate through a clean, white-themed layout styled with Tailwind CSS, custom logo branding (`/logo.png`), and smooth entrance animations.
7. **Sidebar Navigation**  
   Easily switch between different sections of the app—such as the dashboard, chat assistant, document upload zone, and settings—using a dedicated sidebar component with bottom user profile positioning.

---

## Project Structure

```
frontend/
├── public/
│   └── logo.png              # Hisaaby Buddy logo asset
├── src/
│   ├── components/
│   │   ├── HeaderNav.tsx              # Sticky top header for landing view
│   │   ├── HeroSection.tsx            # AI Financial Copilot hero
│   │   ├── FeaturesSection.tsx        # Grid & spotlight for all 7 features
│   │   ├── InteractiveFeatureTabs.tsx # Interactive demonstration playground
│   │   ├── SidebarNavigation.tsx      # Fixed w-72 sidebar with user profile
│   │   ├── Header.tsx                 # Dashboard top context header
│   │   ├── DashboardView.tsx          # Metrics, trends, & recent ledger
│   │   ├── KPICards.tsx               # Total balance, monthly spend, AI savings
│   │   ├── SpendingTrendsChart.tsx    # Category expenditure breakdown
│   │   ├── RecentTransactionsTable.tsx# Real-time transaction history
│   │   ├── AIFinancialAssistantView.tsx# Groq AI conversational copilot
│   │   ├── DocumentUploadView.tsx     # Pinecone RAG document ingest zone
│   │   ├── SettingsView.tsx           # Firebase Auth tenancy inspection
│   │   ├── AppView.tsx                # App mode container
│   │   └── Footer.tsx                 # Footer with tech stack badges
│   ├── App.tsx                        # Root component with view switcher
│   ├── index.css                      # Tailwind v4 theme tokens & utilities
│   └── main.tsx                       # React DOM entrypoint
├── .env                               # Environment variables
├── package.json
└── vite.config.ts
```

---

## Environment Configuration

Create or update `frontend/.env`:

```env
# Backend API Base URL
VITE_API_URL=http://localhost:8000

# Firebase Project ID
VITE_FIREBASE_PROJECT_ID=finsight-ai-e692d

# Application Metadata
VITE_APP_TITLE=Hisaaby Buddy | AI Financial Copilot
```

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Build for Production
```bash
npm run build
```
Generates production bundle in `dist/` verified with TypeScript checks.
