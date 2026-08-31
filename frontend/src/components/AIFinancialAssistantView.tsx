import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  User, 
  AlertCircle, 
  RefreshCw, 
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChatMessage {
  sender: 'user' | 'assistant';
  text: string;
  time: string;
  isError?: boolean;
}

export const AIFinancialAssistantView: React.FC = () => {
  const { user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const CHAT_STORAGE_KEY = 'hissaby_chat_history';

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const cached = localStorage.getItem(CHAT_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [
      {
        sender: 'assistant',
        text: 'Hello! I am your **Hissaby Buddy Financial Copilot**. I have access to your live financial statements, verified OCR records, and budget metrics. Ask me anything about your balance, expenses, vendors, or salary!',
        time: 'Just now'
      }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const quickPrompts = [
    'What is my most expensive purchase?',
    'How much documents are uploaded?',
    'What is my current total balance and spend?',
    'Show breakdown of office equipment vs food expenses',
    'Who are my main payees?',
  ];

  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim() || loading) return;

    const userText = promptText.trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { sender: 'user', text: userText, time: nowTime }]);
    setInput('');
    setLoading(true);
    setErrorMsg(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }

      const res = await fetch(`${apiUrl}/api/chat/ask`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          prompt: userText,
          history: messages.map(m => ({ sender: m.sender, text: m.text }))
        })
      });

      if (res.ok) {
        const data = await res.json();
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: data.response,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Inference request failed' }));
        const errorMessage = errorData.error || errorData.detail || 'Service temporarily unavailable';
        setErrorMsg(`API error: ${errorMessage}`);
        setMessages(prev => [
          ...prev,
          {
            sender: 'assistant',
            text: `Inference alert: ${errorMessage}. Please verify your network and credentials.`,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isError: true
          }
        ]);
      }
    } catch {
      setErrorMsg('Network connectivity error: Could not contact FastAPI agent backend.');
      setMessages(prev => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Network connectivity error. Please ensure the backend server is running.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isError: true
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendPrompt(input);
  };

  const renderInline = (content: string, isUser: boolean) => {
    const parts: React.ReactNode[] = [];
    const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
    let lastIdx = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(content)) !== null) {
      if (match.index > lastIdx) {
        parts.push(content.substring(lastIdx, match.index));
      }
      const chunk = match[0];
      if (chunk.startsWith('**') && chunk.endsWith('**')) {
        parts.push(
          <strong 
            key={match.index} 
            className={`font-black ${isUser ? 'text-white' : 'text-slate-900'}`}
          >
            {chunk.slice(2, -2)}
          </strong>
        );
      } else if (chunk.startsWith('*') && chunk.endsWith('*')) {
        parts.push(
          <em key={match.index} className="italic font-medium">
            {chunk.slice(1, -1)}
          </em>
        );
      }
      lastIdx = regex.lastIndex;
    }

    if (lastIdx < content.length) {
      parts.push(content.substring(lastIdx));
    }

    return parts;
  };

  /**
   * Parse full markdown text with tables (| col | col |), bold (**text**),
   * italic (*text*), and bullet lists (- item)
   */
  const renderMarkdown = (text: string, isUser: boolean) => {
    const lines = text.split('\n');
    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      if (!trimmed) {
        elements.push(<div key={`blank-${i}`} className="h-1.5" />);
        i++;
        continue;
      }

      // Check if this line starts a table (contains '|' and at least 2 cells)
      if (trimmed.startsWith('|') && trimmed.includes('|', 1)) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }

        if (tableLines.length >= 2) {
          const parseRow = (r: string) => {
            const rawCells = r.split('|');
            if (rawCells.length > 2) {
              return rawCells.slice(1, -1).map(c => c.trim());
            }
            return rawCells.map(c => c.trim()).filter(c => c.length > 0);
          };

          const headerCells = parseRow(tableLines[0]);
          let bodyStartIndex = 1;
          if (tableLines.length > 1 && tableLines[1].replace(/[|\s-:]/g, '').length === 0) {
            bodyStartIndex = 2;
          }

          const bodyRows = tableLines.slice(bodyStartIndex).map(parseRow);

          elements.push(
            <div key={`table-${i}`} className="overflow-x-auto my-3 rounded-2xl border border-slate-200 bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/90 text-[#012456] font-bold border-b border-slate-200">
                  <tr>
                    {headerCells.map((h, hIdx) => (
                      <th key={hIdx} className="py-2.5 px-3 whitespace-nowrap text-[11px] font-extrabold uppercase tracking-wider">
                        {renderInline(h, isUser)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {bodyRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                      {row.map((cell, cIdx) => {
                        const isAmount = cell.includes('$') || cell.includes('Rs') || cell.includes('PKR') || cell.startsWith('-') || cell.startsWith('+') || cell.startsWith('–');
                        return (
                          <td key={cIdx} className={`py-2 px-3 whitespace-nowrap ${isAmount ? 'font-bold font-mono text-slate-900' : 'text-slate-700'}`}>
                            {renderInline(cell, isUser)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          continue;
        }
      }

      // Check for bullet list item
      const isBullet = trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.startsWith('* ');
      if (isBullet) {
        const content = trimmed.replace(/^[-•*]\s+/, '');
        elements.push(
          <div key={`bullet-${i}`} className="flex items-start gap-2 pl-1 my-0.5">
            <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
              isUser ? 'bg-blue-200' : 'bg-[#5391FE]'
            }`} />
            <div>{renderInline(content, isUser)}</div>
          </div>
        );
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`p-${i}`} className="my-0.5">
          {renderInline(line, isUser)}
        </p>
      );
      i++;
    }

    return <div className="space-y-1 leading-relaxed">{elements}</div>;
  };

  return (
    <div className="w-full space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-[#012456] tracking-tight flex items-center gap-2">
            <Bot className="w-6 h-6 text-[#5391FE]" />
            AI Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ask questions about your budget, spending, or uploaded documents.
          </p>
        </div>


      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-4 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Full-Width Grid: Chat Area + Interactive Copilot Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Responsive Chat View */}
        <div className="lg:col-span-8 xl:col-span-9 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col h-[calc(100vh-14rem)] overflow-hidden">
          
          {/* Chat Messages Stream */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex gap-3.5 ${msg.sender === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.sender === 'user'
                    ? 'bg-[#012456] text-white shadow-xs'
                    : msg.isError
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-blue-50 text-[#5391FE] border border-blue-100'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-2xl rounded-2xl p-4 text-xs sm:text-sm ${
                  msg.sender === 'user'
                    ? 'bg-[#5391FE] text-white rounded-tr-none shadow-xs'
                    : msg.isError
                      ? 'bg-rose-50/70 border border-rose-200 text-rose-800 rounded-tl-none'
                      : 'bg-slate-50 border border-slate-200 text-slate-800 rounded-tl-none'
                }`}>
                  {renderMarkdown(msg.text, msg.sender === 'user')}
                  <span className={`block text-[10px] mt-2 ${
                    msg.sender === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 italic flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#5391FE] animate-pulse" />
                  <span>Thinking and retrieving live financial context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSend} className="p-4 bg-white border-t border-slate-200 flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="Ask about your financial statements, monthly forecast, or budget..."
              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 disabled:opacity-60 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-[#5391FE] hover:bg-[#437de0] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Right Column: Copilot Insights & Suggested Prompts (Fills the empty space!) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          
          {/* Quick Prompts Card */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-5 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
              Instant Financial Questions
            </h4>
            <div className="space-y-2">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  disabled={loading}
                  onClick={() => handleSendPrompt(p)}
                  className="w-full text-left p-2.5 rounded-xl bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 text-xs font-semibold text-slate-700 hover:text-[#012456] transition-all cursor-pointer block leading-relaxed disabled:opacity-50"
                >
                  "{p}"
                </button>
              ))}
            </div>
          </div>

          {/* RAG Knowledge Grounding Card */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-5 space-y-3 text-xs">
            <h4 className="font-bold text-[#012456] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Grounded AI Engine
            </h4>
            <p className="text-slate-500 leading-relaxed">
              Every answer is strictly grounded in your uploaded statements, OCR ledger, and Pinecone vectors.
            </p>
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span>Vector Dimension:</span>
                <strong className="font-mono text-slate-800">384-d Cosine</strong>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Inference Engine:</span>
                <strong className="text-slate-800">Groq LPU</strong>
              </div>
              <div className="flex items-center justify-between text-slate-500">
                <span>Data Isolation:</span>
                <strong className="text-emerald-600">Per-User Guard</strong>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default AIFinancialAssistantView;
