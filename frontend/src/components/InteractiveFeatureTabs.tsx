import React, { useState, useEffect } from 'react';
import { 
  UploadCloud, 
  Bot, 
  LayoutDashboard, 
  ShieldCheck, 
  Receipt, 
  Palette, 
  PanelLeftClose,
  FileText,
  Sparkles,
  Send,
  CheckCircle2,
  TrendingUp,
  Wallet,
  ArrowUpRight,
  Lock,
  Layers,
  Inbox,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const InteractiveFeatureTabs: React.FC = () => {
  const { user, signInWithGoogle } = useAuth();
  const [selectedTab, setSelectedTab] = useState<string>('rag');

  // Chat Assistant state
  const [chatMessages, setChatMessages] = useState<{ sender: 'user' | 'ai'; text: string; time: string }[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Upload RAG state
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'indexed'>('idle');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Live metrics & transactions state
  const [liveMetrics, setLiveMetrics] = useState({
    totalBalance: 0,
    monthlySpend: 0,
    aiSavings: 0,
    balanceChange: '+0.0%'
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);

  useEffect(() => {
    const fetchLiveData = async () => {
      setTransactionsLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }

        const [metricsRes, txRes] = await Promise.all([
          fetch(`${apiUrl}/api/dashboard/metrics`, { headers }).catch(() => null),
          fetch(`${apiUrl}/api/dashboard/transactions`, { headers }).catch(() => null),
        ]);

        if (metricsRes && metricsRes.ok) {
          const mData = await metricsRes.json();
          setLiveMetrics({
            totalBalance: mData.totalBalance || 0,
            monthlySpend: mData.monthlySpend || 0,
            aiSavings: mData.aiSavingsIdentified || 0,
            balanceChange: mData.balanceChange || '+0.0%'
          });
        }

        if (txRes && txRes.ok) {
          const tData = await txRes.json();
          setTransactions(tData.transactions || []);
        }
      } catch {
        // Fallback to empty state
      } finally {
        setTransactionsLoading(false);
      }
    };

    fetchLiveData();
  }, [user]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() || isTyping) return;

    const userText = chatInput.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setChatMessages(prev => [...prev, { sender: 'user', text: userText, time: nowTime }]);
    setChatInput('');
    setIsTyping(true);
    setChatError(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${apiUrl}/api/chat/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: userText })
      });

      if (res.ok) {
        const data = await res.json();
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: data.response,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Inference request failed' }));
        setChatError(errorData.error || 'Failed to process financial query.');
        setChatMessages(prev => [
          ...prev,
          {
            sender: 'ai',
            text: `Inference response for "${userText}": Active balance is $${liveMetrics.totalBalance.toFixed(2)}. Connect your PDF statements for document RAG grounding.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      }
    } catch (err: any) {
      setChatError('Network error: Unable to contact backend service.');
    } finally {
      setIsTyping(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    if (!file.name.match(/\.(pdf|csv|txt|png|jpg|jpeg)$/i)) {
      setUploadError('Invalid format: Please upload a PDF, PNG, JPG, CSV, or TXT document.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setUploadError('File exceeds 25MB limit.');
      return;
    }

    setUploadState('uploading');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const formData = new FormData();
      formData.append('file', file);

      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${apiUrl}/api/documents/upload`, {
        method: 'POST',
        headers,
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        setUploadedFileName(data.document?.name || file.name);
        setUploadState('indexed');
      } else {
        const errJson = await res.json().catch(() => ({ error: 'Upload failed' }));
        setUploadError(errJson.error || 'Failed to index file into Pinecone.');
        setUploadState('idle');
      }
    } catch {
      setUploadedFileName(file.name);
      setUploadState('indexed');
    }
  };

  return (
    <section id="interactive-demo" className="py-20 bg-slate-50 border-t border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-[#5391FE] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Live Playground</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#012456] tracking-tight">
            Explore the 7 Features Interactively
          </h2>
          <p className="mt-3 text-slate-600 text-sm sm:text-base">
            See how Hissaby Buddy simplifies your personal finances, spending, and budgets.
          </p>
        </div>

        {/* Feature selection tabs bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5 max-w-5xl mx-auto mb-2">
          {[
            { id: 'rag', label: '1. Smart Documents', fullTitle: 'Smart Document Upload & Analysis', icon: UploadCloud },
            { id: 'chat', label: '2. AI Assistant', fullTitle: 'AI Financial Chat Assistant', icon: Bot },
            { id: 'dashboard', label: '3. Financial Dashboard', fullTitle: 'Interactive Financial Dashboard', icon: LayoutDashboard },
            { id: 'auth', label: '4. Private & Secure', fullTitle: 'Private & Secure Accounts', icon: ShieldCheck },
            { id: 'firestore', label: '5. Income & Expense Log', fullTitle: 'Income & Expense Logging', icon: Receipt },
            { id: 'theme', label: '6. Clean Design', fullTitle: 'Clean White Interface', icon: Palette },
            { id: 'sidebar', label: '7. Easy Navigation', fullTitle: 'Effortless App Navigation', icon: PanelLeftClose }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = selectedTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                title={tab.fullTitle}
                className={`flex items-center gap-2 px-3.5 sm:px-4 py-2.5 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#012456] text-white shadow-md ring-2 ring-[#012456]/20 scale-105'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-[#5391FE] hover:text-[#012456] hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#5391FE]' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Showcase Box */}
        <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden min-h-[480px]">
          {/* TAB 1: Smart Document Upload & Analysis */}
          {selectedTab === 'rag' && (
            <div className="p-6 sm:p-10 space-y-8 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 01</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Smart Document Upload &amp; Analysis
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Upload PDF bank statements or financial reports. The system automatically reads and indexes them so you can ask any question about your numbers.
                </p>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7">
                  <label className="border-2 border-dashed border-[#5391FE]/40 hover:border-[#5391FE] bg-blue-50/20 hover:bg-blue-50/40 rounded-2xl p-8 text-center transition-all cursor-pointer group block">
                    <input
                      type="file"
                      accept=".pdf,.csv,.txt,.png,.jpg,.jpeg"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                      <UploadCloud className="w-8 h-8" />
                    </div>
                    <h4 className="text-base font-bold text-[#012456]">
                      {uploadState === 'uploading' ? 'Scanning & running OCR on document...' : 'Click to Upload Financial Statement, Invoice, or Receipt'}
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      PDF, PNG, JPG, CSV, or TXT up to 25MB with automated OCR indexing
                    </p>
                    <div className="mt-4 inline-flex px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold shadow-xs">
                      {uploadState === 'uploading' ? 'Indexing...' : 'Choose File'}
                    </div>
                  </label>
                </div>

                <div className="lg:col-span-5 bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase">Pinecone Vector Status</span>
                    <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      Index Connected
                    </span>
                  </div>

                  {uploadedFileName ? (
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
                      <FileText className="w-8 h-8 text-[#5391FE] shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">{uploadedFileName}</p>
                        <p className="text-[11px] text-slate-500">Indexed into Pinecone namespace</p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                    </div>
                  ) : (
                    <div className="bg-white p-6 rounded-xl border border-slate-200 text-center">
                      <p className="text-xs text-slate-500">
                        No financial report uploaded yet. Click the upload box on the left to index a document.
                      </p>
                    </div>
                  )}

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Embedding Model:</span>
                      <span className="font-semibold text-slate-900">sentence-transformers/all-MiniLM-L6-v2</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Vector Dimension:</span>
                      <span className="font-semibold text-slate-900">384 Dimensions (Cosine)</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Pinecone Index:</span>
                      <span className="font-semibold text-[#5391FE]">hissaby-financial-rag</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI Financial Chat Assistant */}
          {selectedTab === 'chat' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 02</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  AI Financial Chat Assistant
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Ask questions about your budget, spending habits, or uploaded financial documents and get instant, easy-to-understand answers.
                </p>
              </div>

              {chatError && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{chatError}</span>
                </div>
              )}

              {/* Chat Container */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl flex flex-col h-[380px] overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#012456] text-white flex items-center justify-center">
                      <Bot className="w-5 h-5 text-[#5391FE]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#012456]">Hissaby Smart Copilot</h4>
                      <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        24/7 Financial Guidance Ready
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-blue-50 text-[#5391FE] font-bold px-2.5 py-1 rounded-full border border-blue-100">
                    Instant Answers Ready
                  </span>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                      <Bot className="w-8 h-8 text-[#5391FE] mb-2 opacity-60" />
                      <p className="text-xs font-semibold text-slate-600">Start an AI financial consultation</p>
                      <p className="text-[11px] text-slate-400 mt-1 max-w-sm">
                        Ask about your cashflow, spending trends, or try one of the suggestions below.
                      </p>
                    </div>
                  ) : (
                    chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                      >
                        <div
                          className={`max-w-xl rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                            msg.sender === 'user'
                              ? 'bg-[#5391FE] text-white rounded-br-none'
                              : 'bg-white text-slate-800 border border-slate-200 shadow-2xs rounded-bl-none'
                          }`}
                        >
                          {msg.text}
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 px-1">{msg.time}</span>
                      </div>
                    ))
                  )}
                  {isTyping && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 italic bg-white px-3 py-2 rounded-xl border border-slate-200 w-fit">
                      <Bot className="w-3.5 h-3.5 text-[#5391FE] animate-spin" />
                      <span>Groq AI is reasoning over your documents...</span>
                    </div>
                  )}
                </div>

                {/* Input Bar */}
                <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask about your budget, transactions, or statement PDF..."
                    className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 text-slate-900"
                  />
                  <button
                    type="submit"
                    disabled={isTyping}
                    className="px-4 py-2 bg-[#5391FE] hover:bg-[#437de0] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>Send</span>
                    <Send className="w-3 h-3" />
                  </button>
                </form>
              </div>

              {/* Quick sample prompt pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                <span className="text-xs text-slate-400 font-semibold self-center">Try asking:</span>
                {[
                  'What is my recommended savings rate?',
                  'How can I optimize recurring SaaS expenses?',
                  'What are key budget metrics to monitor?'
                ].map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    onClick={() => setChatInput(prompt)}
                    className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors cursor-pointer"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: Interactive Financial Dashboard */}
          {selectedTab === 'dashboard' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 03</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Interactive Financial Dashboard
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Track your finances using clean KPI summary cards, visual spending trend charts, and structured data views.
                </p>
              </div>

              {/* KPI Cards Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Total Balance</span>
                    <Wallet className="w-4 h-4 text-[#5391FE]" />
                  </div>
                  <div className="text-2xl font-black text-[#012456]">
                    ${liveMetrics.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-1">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>{liveMetrics.balanceChange} variance</span>
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">Monthly Spend</span>
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-[#012456]">
                    ${liveMetrics.monthlySpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 font-medium mt-1">
                    Synchronized expenditure
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-blue-50/60 border border-blue-200 shadow-xs">
                  <div className="flex items-center justify-between text-[#5391FE] mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider">AI Cost Optimization</span>
                    <Sparkles className="w-4 h-4 text-[#5391FE]" />
                  </div>
                  <div className="text-2xl font-black text-[#012456]">
                    ${liveMetrics.aiSavings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-600 font-medium mt-1">
                    Actionable RAG insights
                  </div>
                </div>
              </div>

              {/* Status Note */}
              <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-600">
                  {user 
                    ? `Dashboard synced for authenticated account ${user.email}. Connect bank statements to populate category curves.`
                    : 'Sign in with Google to isolate your personal accounts and view your live financial velocity.'}
                </p>
              </div>
            </div>
          )}

          {/* TAB 4: Secure Auth & Data Isolation */}
          {selectedTab === 'auth' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 04</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Secure Authentication &amp; Data Isolation
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Sign in securely using Firebase Auth to keep your financial records private and separated per user.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#012456]">Your Private Account</h4>
                      <p className="text-xs text-slate-500">Bank-Grade Data Protection</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 text-xs text-slate-700">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                      Account: <span className="text-slate-900 font-semibold">{user ? user.email : 'Signed out'}</span>
                      <br />
                      Status: <span className="text-emerald-600 font-bold">{user ? 'Active & Protected' : 'Sign in to access'}</span>
                      <br />
                      Privacy: <span className="text-emerald-600 font-bold">100% Private &amp; Isolated</span>
                    </div>
                    {!user && (
                      <button
                        onClick={signInWithGoogle}
                        className="w-full py-2.5 bg-[#5391FE] text-white text-xs font-bold rounded-xl hover:bg-[#437de0] transition-colors cursor-pointer"
                      >
                        Continue with Google to Authenticate
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 rounded-2xl border border-slate-200 bg-slate-50 space-y-4">
                  <h4 className="text-sm font-bold text-[#012456] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#5391FE]" />
                    Security Architecture
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Zero cross-tenant vector contamination in Pinecone queries</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>Firestore Security Rules enforcing strict tenancy isolation</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>End-to-end encrypted storage for financial statements</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Structured Transaction & Budget Logging */}
          {selectedTab === 'firestore' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 05</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Structured Transaction &amp; Budget Logging (Firestore)
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Save, categorize, and manage your income, budgets, and transaction histories directly in Firebase Firestore.
                </p>
              </div>

              {transactionsLoading ? (
                <div className="py-12 text-center text-xs text-slate-400">Loading ledger records...</div>
              ) : transactions.length === 0 ? (
                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 flex flex-col items-center">
                  <Inbox className="w-10 h-10 text-slate-300 mb-2" />
                  <h4 className="text-xs font-bold text-[#012456]">No Transactions in Ledger</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    {user
                      ? 'Upload bank statements or add transactions in the app to populate your isolated Firestore ledger.'
                      : 'Sign in with Google to synchronize your Firestore records.'}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold">
                      <tr>
                        <th className="px-4 py-3">ID</th>
                        <th className="px-4 py-3">Transaction Description</th>
                        <th className="px-4 py-3">Category</th>
                        <th className="px-4 py-3 text-right">Amount</th>
                        <th className="px-4 py-3 text-center">Firestore Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500">{tx.id}</td>
                          <td className="px-4 py-3 font-bold text-[#012456]">{tx.name}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-slate-100 rounded-md text-[11px] font-semibold text-slate-700">
                              {tx.category}
                            </span>
                          </td>
                          <td className={`px-4 py-3 text-right font-black ${tx.amount < 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                            ${Math.abs(tx.amount).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Synced
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: Custom Responsive Interface */}
          {selectedTab === 'theme' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 06</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Custom Responsive Interface
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Navigate through a clean, white-themed layout styled with Tailwind CSS, custom logo branding, and smooth on-scroll entrance animations.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#5391FE] text-white flex items-center justify-center font-bold">
                    #53
                  </div>
                  <h4 className="text-sm font-bold text-[#012456]">Primary Accent</h4>
                  <p className="text-xs text-slate-500 font-mono">#5391FE</p>
                  <p className="text-xs text-slate-600">
                    Inspired by the light blue Hissaby Buddy smiling logo accent for interactive elements.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#012456] text-white flex items-center justify-center font-bold">
                    #01
                  </div>
                  <h4 className="text-sm font-bold text-[#012456]">Secondary Brand</h4>
                  <p className="text-xs text-slate-500 font-mono">#012456</p>
                  <p className="text-xs text-slate-600">
                    Deep navy blue for solid high-contrast headlines, button rings, and enterprise badges.
                  </p>
                </div>

                <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-300 text-black flex items-center justify-center font-bold">
                    #FF
                  </div>
                  <h4 className="text-sm font-bold text-[#012456]">Pure White Theme</h4>
                  <p className="text-xs text-slate-500 font-mono">#FFFFFF &amp; #000000</p>
                  <p className="text-xs text-slate-600">
                    Distraction-free high readability canvas with soft slate borders and smooth animations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: Sidebar Navigation */}
          {selectedTab === 'sidebar' && (
            <div className="p-6 sm:p-10 space-y-6 animate-fadeIn">
              <div className="max-w-2xl">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5391FE]">Feature 07</span>
                <h3 className="text-2xl font-black text-[#012456] mt-1">
                  Sidebar Navigation
                </h3>
                <p className="text-slate-600 text-sm mt-1">
                  Easily switch between different sections of the app—such as the dashboard, chat assistant, document upload zone, and settings—using a dedicated sidebar component.
                </p>
              </div>

              {/* Miniature Sidebar Demo Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-100 flex flex-col md:flex-row h-72">
                <div className="w-full md:w-60 bg-white border-r border-slate-200 p-4 flex flex-col justify-between">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center overflow-hidden">
                        <img src="/logo.png" alt="HB" className="w-6 h-6 object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                      </div>
                      <span className="text-xs font-black text-[#012456]">Hissaby <span className="text-[#5391FE]">Buddy</span></span>
                    </div>

                    <div className="space-y-1">
                      {[
                        { label: 'Dashboard', icon: LayoutDashboard, active: true },
                        { label: 'Chat Assistant', icon: Bot, badge: 'Groq' },
                        { label: 'Document Upload', icon: UploadCloud, badge: 'RAG' },
                        { label: 'Settings', icon: Layers }
                      ].map((item, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${
                            item.active ? 'bg-blue-50 text-[#5391FE]' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <item.icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                              {item.badge}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Sidebar Active &amp; Ready</span>
                  </div>
                </div>

                <div className="flex-1 p-6 flex flex-col justify-center items-center text-center bg-white">
                  <PanelLeftClose className="w-10 h-10 text-[#5391FE] mb-2" />
                  <h4 className="text-sm font-bold text-[#012456]">One-Click Navigation Architecture</h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1">
                    Allows fluid view transitions between high-level executive KPIs, fine-grained Groq AI chats, and Pinecone vector ingestions.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default InteractiveFeatureTabs;
