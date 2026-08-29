import React from 'react';
import { 
  UploadCloud, 
  Bot, 
  LayoutDashboard, 
  ShieldCheck, 
  Receipt, 
  Palette, 
  PanelLeftClose, 
  CheckCircle2, 
  ArrowRight,
  Sparkles,
  FileText,
  Lock,
  TrendingUp,
  Wallet,
  ScanLine,
  Search,
  Shield,
  Layers,
  Smartphone
} from 'lucide-react';

interface SevenFeatureSectionsProps {
  onOpenApp?: () => void;
}

export const SevenFeatureSections: React.FC<SevenFeatureSectionsProps> = ({ onOpenApp }) => {
  return (
    <div className="space-y-0 text-slate-900">

      {/* ========================================================================= */}
      {/* SECTION 1: SMART DOCUMENT UPLOAD & RAG */}
      {/* ========================================================================= */}
      <section id="feature-document-upload" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Text Information & SEO Headings */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#5391FE] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#5391FE]" />
                <span>Feature 01 • Smart Ingestion &amp; OCR</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Smart Document Upload &amp; Intelligent OCR Search
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Upload PDF bank statements, PNG receipts, invoices, or financial reports so the system can automatically read, chunk, and index them into Pinecone for semantic vector searching.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <ScanLine className="w-6 h-6 text-[#5391FE] mb-2" />
                  <h4 className="text-sm font-bold text-[#012456]">Multi-Format OCR</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Accepts PDF files as well as image formats (PNG, JPG, JPEG) with built-in Optical Character Recognition.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Search className="w-6 h-6 text-emerald-600 mb-2" />
                  <h4 className="text-sm font-bold text-[#012456]">Semantic Vector Indexing</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Extracts text and chunks it into high-dimensional vector embeddings for lightning-fast search retrieval.
                  </p>
                </div>
              </div>

              <ul className="space-y-2.5 pt-2 text-xs sm:text-sm text-slate-700 font-medium">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Automatic statement parsing with zero manual data entry</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Sub-second retrieval over years of transaction histories</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Strict per-user namespace isolation in Pinecone vector storage</span>
                </li>
              </ul>

              <div className="pt-4">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Try Document Upload</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: UI Visual Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#012456]">Smart Document Processing</h4>
                      <p className="text-[10px] text-slate-500">Automated OCR &amp; Vector Index</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Vector Sync
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#5391FE] shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#012456]">Bank_Statement_July_2026.pdf</p>
                        <p className="text-[10px] text-slate-400">PDF • 1.8 MB • 32 Semantic Chunks Extracted</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                      Indexed
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <ScanLine className="w-8 h-8 text-indigo-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-[#012456]">Receipt_Store_Equipment.png</p>
                        <p className="text-[10px] text-slate-400">PNG Image • OCR Line-Item Text Detected</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      OCR Done
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-slate-600 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-[#5391FE] shrink-0 mt-0.5" />
                  <p>
                    All extracted financial statements are chunked and converted into 384-dimensional vector embeddings, ready to answer questions via the AI assistant.
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 2: AI FINANCIAL CHAT ASSISTANT */}
      {/* ========================================================================= */}
      <section id="feature-ai-assistant" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: UI Visual Card */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#5391FE] text-white flex items-center justify-center">
                      <Bot className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white">Hisaaby Financial Copilot</h4>
                      <p className="text-[10px] text-emerald-400">Grounded strictly in financial data</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-white/10 text-blue-200 px-2.5 py-1 rounded-full">
                    Active Session
                  </span>
                </div>

                <div className="p-6 space-y-4 text-xs">
                  {/* User query */}
                  <div className="flex justify-end">
                    <div className="max-w-md bg-[#5391FE] text-white p-3.5 rounded-2xl rounded-tr-none leading-relaxed">
                      What was my total expenditure on cloud services last month based on my bank statements?
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="max-w-md bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-2xl rounded-tl-none space-y-2 leading-relaxed">
                      <p>
                        Based on your uploaded July statement, your total cloud expenditure was <strong>$342.50</strong> across 3 transactions:
                      </p>
                      <ul className="list-disc pl-4 space-y-1 text-slate-600 text-[11px]">
                        <li>Cloud Server Cluster: $220.00</li>
                        <li>Vector Storage Node: $82.50</li>
                        <li>DNS &amp; Security Services: $40.00</li>
                      </ul>
                      <p className="text-emerald-700 font-semibold text-[11px] pt-1">
                        💡 You are currently 12% below your allocated cloud budget cap.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-[11px] text-slate-400">
                  Strictly grounded • Unrelated queries politely refused
                </div>
              </div>
            </div>

            {/* Right: Text Information */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Feature 02 • Conversational Financial Intelligence</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                AI Financial Chat Assistant Powered by Groq AI
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Ask questions about your budget, spending habits, or uploaded financial documents and get instant, real-time answers powered by Groq AI.
              </p>

              <div className="space-y-3 pt-2">
                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h4 className="text-sm font-bold text-[#012456]">100% Financial Grounding</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Unlike general chatbots, Hisaaby Buddy is strictly dedicated to your numbers. If an irrelevant question is asked, it stays on track: <em>"This is not in my rule."</em>
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white border border-slate-200">
                  <h4 className="text-sm font-bold text-[#012456]">Direct Statement Q&amp;A</h4>
                  <p className="text-xs text-slate-600 mt-1">
                    Inquire about specific vendors, suspicious charges, or recurring expenses directly against your uploaded PDF statements and images.
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#012456] hover:bg-[#022f6d] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Chat with Copilot</span>
                  <ArrowRight className="w-4 h-4 text-[#5391FE]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 3: INTERACTIVE FINANCIAL DASHBOARD */}
      {/* ========================================================================= */}
      <section id="feature-dashboard" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Text Information */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-[#5391FE] text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-[#5391FE]" />
                <span>Feature 03 • Real-Time Analytics</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Interactive Financial Dashboard
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Track your finances using clean KPI summary cards, visual spending trend charts, and structured data views.
              </p>

              <div className="space-y-4 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center shrink-0 mt-0.5">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Executive KPI Cards</h4>
                    <p className="text-xs text-slate-500">
                      Monitor Total Balance, Monthly Velocity, and Identified AI Savings in one unified glance.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Visual Spending Trends &amp; Velocity</h4>
                    <p className="text-xs text-slate-500">
                      Interactive bar charts breakdown expenditure by category against your monthly budget caps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Live Ledger Table</h4>
                    <p className="text-xs text-slate-500">
                      Structured per-user transaction histories sorted chronologically with category tags and statuses.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Open Interactive Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: UI Visual Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Total Balance</span>
                    <div className="text-2xl font-black text-[#012456] mt-1">$18,420.00</div>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-2">
                      +8.4% this month
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
                    <span className="text-[10px] font-bold uppercase text-slate-400">Monthly Spend</span>
                    <div className="text-2xl font-black text-[#012456] mt-1">$3,150.00</div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-2">
                      Under Budget Cap
                    </span>
                  </div>
                </div>

                {/* Mini Visual Chart */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-[#012456]">
                    <span>Spending Breakdown by Category</span>
                    <span className="text-slate-400 font-normal">Real-Time</span>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Operations & Software', pct: 65, color: 'bg-[#5391FE]' },
                      { label: 'Cloud Infrastructure', pct: 45, color: 'bg-emerald-500' },
                      { label: 'Marketing & Outreach', pct: 30, color: 'bg-indigo-500' },
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>{item.label}</span>
                          <span className="font-bold text-slate-900">{item.pct}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 4: SECURE AUTHENTICATION & DATA ISOLATION */}
      {/* ========================================================================= */}
      <section id="feature-auth-security" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: UI Visual Card */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-5">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Firebase Tenancy Isolation</h4>
                    <p className="text-xs text-slate-500">Per-User Data Protection Active</p>
                  </div>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Auth Provider:</span>
                      <span className="text-slate-900">Google OAuth &amp; Email/Password</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Firestore Scoping:</span>
                      <span className="text-emerald-600 font-bold">Strict User Tenancy (UID Isolated)</span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-semibold">
                      <span>Pinecone Vector Scope:</span>
                      <span className="text-[#5391FE] font-mono">metadata.userId == user.uid</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 text-slate-700 space-y-1">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Zero Cross-Tenant Contamination
                    </p>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      Your bank statements, personal spending habits, and budgets can never be accessed or searched by any other user.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Text Information */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Feature 04 • Enterprise Security</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Secure Authentication &amp; Data Isolation
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Sign in securely using Firebase Auth to keep your financial records private and separated per user.
              </p>

              <div className="space-y-3.5 pt-2 text-xs sm:text-sm text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <Lock className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#012456]">Dual Authentication Options</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Sign in seamlessly with your Google Account or create a dedicated Email and Password login.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-amber-600 shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-bold text-[#012456]">Isolated Vector Namespaces</p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Every chunk and vector created in Pinecone is tagged with your verified user UID to guarantee complete data segregation.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#012456] hover:bg-[#022f6d] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Sign In to Access Your Records</span>
                  <ArrowRight className="w-4 h-4 text-[#5391FE]" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 5: STRUCTURED TRANSACTION & BUDGET LOGGING */}
      {/* ========================================================================= */}
      <section id="feature-transaction-logging" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Text Information */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-violet-500" />
                <span>Feature 05 • Cloud Database Ledger</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Structured Transaction &amp; Budget Logging
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Save, categorize, and manage your income, budgets, and transaction histories directly in Firebase Firestore.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <Receipt className="w-6 h-6 text-violet-600 mb-2" />
                  <h4 className="text-sm font-bold text-[#012456]">Automated Categorization</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Transactions are categorized into Income, Utilities, Subscriptions, and Operations automatically.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <TrendingUp className="w-6 h-6 text-[#5391FE] mb-2" />
                  <h4 className="text-sm font-bold text-[#012456]">Budget Thresholds</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Set spending limits per category and receive intelligent insights before you overspend.
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>View Transaction Ledger</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Right: UI Visual Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-200 text-xs font-bold text-[#012456]">
                  <span>Live Firestore Ledger</span>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-semibold">
                    Cloud Synced
                  </span>
                </div>

                <div className="space-y-2.5">
                  {[
                    { name: 'Stripe SaaS Payout', cat: 'Revenue', amount: '+$3,450.00', isDebit: false },
                    { name: 'Cloud Infrastructure Hosting', cat: 'Cloud', amount: '-$124.50', isDebit: true },
                    { name: 'Office Workstation Lease', cat: 'Operations', amount: '-$310.00', isDebit: true }
                  ].map((tx, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white border border-slate-200 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#012456]">{tx.name}</p>
                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          {tx.cat}
                        </span>
                      </div>
                      <span className={`text-xs font-black ${tx.isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {tx.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 6: CUSTOM RESPONSIVE WHITE-THEMED INTERFACE */}
      {/* ========================================================================= */}
      <section id="feature-responsive-interface" className="py-24 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: UI Visual Card */}
            <div className="lg:col-span-6 order-2 lg:order-1">
              <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xl space-y-6">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#5391FE] text-white flex items-center justify-center mx-auto text-xs font-bold mb-1">
                      HB
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">#5391FE</span>
                    <p className="text-[9px] text-slate-400">Primary Accent</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-[#012456] text-white flex items-center justify-center mx-auto text-xs font-bold mb-1">
                      HB
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">#012456</span>
                    <p className="text-[9px] text-slate-400">Navy Headlines</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-white border border-slate-200">
                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-300 text-slate-900 flex items-center justify-center mx-auto text-xs font-bold mb-1">
                      #FF
                    </div>
                    <span className="text-[10px] font-bold text-slate-700">#FFFFFF</span>
                    <p className="text-[9px] text-slate-400">Pure White</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#012456]">
                    <Smartphone className="w-4 h-4 text-[#5391FE]" />
                    <span>Fluid Multi-Device Responsiveness</span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Built using Tailwind CSS with mobile-first viewport scaling, custom scrollbars, and smooth on-scroll micro-animations.
                  </p>
                </div>
              </div>
            </div>

            {/* Right: Text Information */}
            <div className="lg:col-span-6 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-sky-500" />
                <span>Feature 06 • Design Excellence</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Custom Responsive White-Themed Interface
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Navigate through a clean, white-themed layout styled with Tailwind CSS, custom logo branding, and smooth on-scroll entrance animations.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#5391FE] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Palette className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Distraction-Free Visuals</h4>
                    <p className="text-xs text-slate-500">
                      High-contrast typography paired with comfortable whitespace to focus on what matters: your financial data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 text-[#012456] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Adaptive Layout Architecture</h4>
                    <p className="text-xs text-slate-500">
                      Seamless experience whether checking rapid transactions on a smartphone or analyzing quarterly ledgers on an ultrawide desktop monitor.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* SECTION 7: SIDEBAR NAVIGATION */}
      {/* ========================================================================= */}
      <section id="feature-sidebar-navigation" className="py-24 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left: Text Information */}
            <div className="lg:col-span-6 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                <span>Feature 07 • Productivity Hub</span>
              </div>
              
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#012456] tracking-tight leading-tight text-balance">
                Dedicated Sidebar Navigation
              </h2>
              
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
                Easily switch between different sections of the app—such as the dashboard, chat assistant, document upload zone, and settings—using a dedicated sidebar component.
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center shrink-0 mt-0.5">
                    <PanelLeftClose className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">One-Click Section Toggling</h4>
                    <p className="text-xs text-slate-500">
                      Fluidly transition between executive KPIs, conversational AI consultations, and document upload drops without reloading.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#012456]">Account &amp; Status Badges</h4>
                    <p className="text-xs text-slate-500">
                      Permanent visibility of your authenticated Google profile, active session tenancy, and instant sign-out control at the bottom.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={onOpenApp}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#012456] hover:bg-[#022f6d] text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  <span>Experience App Navigation</span>
                  <ArrowRight className="w-4 h-4 text-[#5391FE]" />
                </button>
              </div>
            </div>

            {/* Right: UI Visual Card */}
            <div className="lg:col-span-6">
              <div className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200 shadow-xl space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    Sidebar Views
                  </span>
                  <div className="space-y-1.5">
                    {[
                      { icon: LayoutDashboard, label: 'Dashboard', badge: 'Live Metrics', active: true },
                      { icon: Bot, label: 'AI Financial Assistant', badge: 'Smart AI' },
                      { icon: UploadCloud, label: 'Document Upload', badge: 'Auto-Sync' },
                      { icon: ShieldCheck, label: 'Account & Security', badge: 'Protected' }
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-bold ${
                          item.active 
                            ? 'bg-blue-50 text-[#5391FE] border border-blue-100' 
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <item.icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                        <span className="text-[9px] px-2 py-0.5 bg-white border border-slate-200 rounded font-semibold text-slate-600">
                          {item.badge}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </div>
  );
};

export default SevenFeatureSections;
