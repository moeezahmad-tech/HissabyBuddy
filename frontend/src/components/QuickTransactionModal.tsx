import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  PlusCircle, 
  Briefcase, 
  ShoppingCart, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { currentCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<'ai' | 'expense' | 'income'>('ai');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // AI Tab State
  const [aiText, setAiText] = useState('');

  // Manual Expense State
  const [expenseName, setExpenseName] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('Food & Groceries');
  const [expensePayee, setExpensePayee] = useState('');
  const [expensePurpose, setExpensePurpose] = useState('');

  // Income / Salary State
  const [incomeName, setIncomeName] = useState('Monthly Salary');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeEmployer, setIncomeEmployer] = useState('');
  const [incomeCategory, setIncomeCategory] = useState('Salary & Income');

  if (!isOpen) return null;

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiText.trim()) return;

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch(`${apiUrl}/api/dashboard/log-natural-language`, {
        method: 'POST',
        headers,
        body: json_stringify({ text: aiText }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessMsg(data.message || 'Transaction successfully logged via AI!');
        setAiText('');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to process natural language text.');
      }
    } catch {
      setError('Network error: Unable to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  const handleManualSubmit = async (isCredit: boolean) => {
    const name = isCredit ? incomeName : expenseName;
    const amountStr = isCredit ? incomeAmount : expenseAmount;
    const category = isCredit ? incomeCategory : expenseCategory;
    const payee = isCredit ? incomeEmployer : expensePayee;
    const purpose = isCredit ? 'Monthly Salary Deposit' : expensePurpose;

    if (!name || !amountStr) {
      setError('Please provide a name and amount.');
      return;
    }

    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive number for amount.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch(`${apiUrl}/api/dashboard/add-manual-transaction`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name,
          amount: numAmount,
          isCredit,
          category,
          payee,
          purpose,
          currency: currentCurrency.code,
          currencySymbol: currentCurrency.symbol,
        }),
      });

      if (res.ok) {
        setSuccessMsg(`Successfully logged ${name} (${currentCurrency.symbol}${numAmount.toLocaleString()})!`);
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1200);
      } else {
        const err = await res.json();
        setError(err.detail || 'Failed to record transaction.');
      }
    } catch {
      setError('Network error: Unable to connect to backend.');
    } finally {
      setLoading(false);
    }
  };

  function json_stringify(obj: any) {
    return JSON.stringify(obj);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
              <PlusCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#012456]">
                Log Financial Activity
              </h3>
              <p className="text-xs text-slate-400">
                Record monthly salary, manual purchases, or use AI text input
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-2xl my-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('ai')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-white text-[#5391FE] shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI Text Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('expense')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'expense'
                ? 'bg-white text-rose-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Log Expense</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('income')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'income'
                ? 'bg-white text-emerald-600 shadow-2xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Add Salary</span>
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab 1: AI Natural Language */}
        {activeTab === 'ai' && (
          <form onSubmit={handleAiSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Describe your transaction in plain English:
              </label>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="e.g. 'Received 150000 monthly salary from Google' or 'Paid 3500 for grocery shopping at Metro yesterday'"
                rows={3}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all resize-none"
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase block w-full">Quick suggestions:</span>
              <button
                type="button"
                onClick={() => setAiText('Received 120,000 monthly salary')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                + Salary 120k
              </button>
              <button
                type="button"
                onClick={() => setAiText('Paid 4,500 electricity utility bill')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                - Electricity Bill 4.5k
              </button>
              <button
                type="button"
                onClick={() => setAiText('Spent 3,200 on groceries')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
              >
                - Groceries 3.2k
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !aiText.trim()}
              className="w-full py-3 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>AI Parsing Transaction...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Parse &amp; Commit with AI</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tab 2: Manual Expense */}
        {activeTab === 'expense' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleManualSubmit(false);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Expense Title / Item</label>
              <input
                type="text"
                value={expenseName}
                onChange={(e) => setExpenseName(e.target.value)}
                placeholder="e.g. Office Supplies, Groceries, Dinner"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Amount ({currentCurrency.code})</label>
                <input
                  type="number"
                  step="any"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="e.g. 2500"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                >
                  <option value="Food & Groceries">Food &amp; Groceries</option>
                  <option value="Utilities & Bills">Utilities &amp; Bills</option>
                  <option value="Rent & Housing">Rent &amp; Housing</option>
                  <option value="Office Equipment">Office Equipment</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Shopping & Tech">Shopping &amp; Tech</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Payee / Store</label>
                <input
                  type="text"
                  value={expensePayee}
                  onChange={(e) => setExpensePayee(e.target.value)}
                  placeholder="e.g. Metro, Amazon, Landlord"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Purpose / Note</label>
                <input
                  type="text"
                  value={expensePurpose}
                  onChange={(e) => setExpensePurpose(e.target.value)}
                  placeholder="e.g. Monthly electricity bill"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              <span>Log Expense ({currentCurrency.symbol})</span>
            </button>
          </form>
        )}

        {/* Tab 3: Add Salary / Income */}
        {activeTab === 'income' && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleManualSubmit(true);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Income Title</label>
              <input
                type="text"
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                placeholder="e.g. Monthly Salary, Freelance Payment, Bonus"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Salary Amount ({currentCurrency.code})</label>
                <input
                  type="number"
                  step="any"
                  value={incomeAmount}
                  onChange={(e) => setIncomeAmount(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
                <select
                  value={incomeCategory}
                  onChange={(e) => setIncomeCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Salary & Income">Salary &amp; Income</option>
                  <option value="Freelance & Consulting">Freelance &amp; Consulting</option>
                  <option value="Business Revenue">Business Revenue</option>
                  <option value="Investments & Dividends">Investments &amp; Dividends</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Employer / Client / Company</label>
              <input
                type="text"
                value={incomeEmployer}
                onChange={(e) => setIncomeEmployer(e.target.value)}
                placeholder="e.g. Acme Corp, Tech Innovations Ltd"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Briefcase className="w-4 h-4" />}
              <span>Record Salary Deposit (+{currentCurrency.symbol})</span>
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default QuickTransactionModal;
