import React, { useState, useEffect } from 'react';
import { 
  Repeat, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  TrendingUp, 
  Home, 
  Briefcase, 
  Wallet, 
  Zap, 
  Wifi, 
  Smartphone, 
  GraduationCap, 
  Car, 
  Tv, 
  ArrowUpRight, 
  ArrowDownRight,
  AlertCircle,
  Sparkles,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

export interface RecurringItem {
  id: string;
  name: string;
  amount: number;
  isIncome: boolean;
  category: string;
  frequency: 'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Yearly';
  dueDay: number;
  notes?: string;
  isActive: boolean;
  currency?: string;
  currencySymbol?: string;
  createdAt?: string;
  lastPosted?: string;
}

const PRESET_TEMPLATES = [
  { name: 'House Rent', amount: 35000, isIncome: false, category: 'Housing', dueDay: 1, icon: Home },
  { name: 'Monthly Salary', amount: 150000, isIncome: true, category: 'Salary & Income', dueDay: 1, icon: Briefcase },
  { name: 'Pocket Money', amount: 8000, isIncome: false, category: 'Personal & Family', dueDay: 5, icon: Wallet },
  { name: 'Electricity Bill', amount: 12000, isIncome: false, category: 'Utilities', dueDay: 10, icon: Zap },
  { name: 'Internet / Wi-Fi', amount: 3500, isIncome: false, category: 'Utilities', dueDay: 15, icon: Wifi },
  { name: 'Mobile Postpaid', amount: 2200, isIncome: false, category: 'Utilities', dueDay: 20, icon: Smartphone },
  { name: 'School / College Fees', amount: 15000, isIncome: false, category: 'Education', dueDay: 5, icon: GraduationCap },
  { name: 'Car Loan Installment', amount: 28000, isIncome: false, category: 'Transport', dueDay: 10, icon: Car },
  { name: 'Streaming / Subscriptions', amount: 1800, isIncome: false, category: 'Subscriptions', dueDay: 25, icon: Tv },
];

export const RecurringMoneyView: React.FC = () => {
  const { user } = useAuth();
  const { currentCurrency, formatAmount } = useCurrency();

  const [items, setItems] = useState<RecurringItem[]>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_recurring');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'expense' | 'income'>('all');
  const [postingId, setPostingId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formIsIncome, setFormIsIncome] = useState(false);
  const [formCategory, setFormCategory] = useState('Housing');
  const [formFrequency, setFormFrequency] = useState<'Monthly' | 'Weekly' | 'Bi-Weekly' | 'Yearly'>('Monthly');
  const [formDueDay, setFormDueDay] = useState(1);
  const [formNotes, setFormNotes] = useState('');

  const fetchRecurringItems = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${apiUrl}/api/dashboard/recurring`, { headers });
      if (res.ok) {
        const data = await res.json();
        const recList = data.items || [];
        setItems(recList);
        localStorage.setItem('hissaby_cached_recurring', JSON.stringify(recList));
      }
    } catch {
      // offline fallback
    }
  };

  useEffect(() => {
    fetchRecurringItems();
  }, [user]);

  const handleOpenPreset = (preset: typeof PRESET_TEMPLATES[0]) => {
    setFormName(preset.name);
    setFormAmount(String(preset.amount));
    setFormIsIncome(preset.isIncome);
    setFormCategory(preset.category);
    setFormFrequency('Monthly');
    setFormDueDay(preset.dueDay);
    setFormNotes('');
    setIsModalOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAmount || Number(formAmount) <= 0) {
      setErrorToast('Please specify a valid title and amount.');
      return;
    }

    const payload = {
      name: formName.trim(),
      amount: Number(formAmount),
      isIncome: formIsIncome,
      category: formCategory,
      frequency: formFrequency,
      dueDay: Number(formDueDay),
      notes: formNotes.trim() || undefined,
      isActive: true,
      currency: currentCurrency.code,
      currencySymbol: currentCurrency.symbol
    };

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${apiUrl}/api/dashboard/recurring`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        const updated = [data.item, ...items];
        setItems(updated);
        localStorage.setItem('hissaby_cached_recurring', JSON.stringify(updated));
        setIsModalOpen(false);
        setSuccessToast(`Added recurring ${formName} successfully!`);
        setTimeout(() => setSuccessToast(null), 3500);
      } else {
        setErrorToast('Failed to save recurring commitment to backend.');
      }
    } catch {
      // Offline fallback: save locally
      const localItem: RecurringItem = {
        id: `REC-LOC-${Date.now()}`,
        ...payload
      };
      const updated = [localItem, ...items];
      setItems(updated);
      localStorage.setItem('hissaby_cached_recurring', JSON.stringify(updated));
      setIsModalOpen(false);
      setSuccessToast(`Added recurring ${formName} (saved locally)!`);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to remove recurring '${name}'?`)) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      await fetch(`${apiUrl}/api/dashboard/recurring/${id}`, {
        method: 'DELETE',
        headers
      });
    } catch {}

    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    localStorage.setItem('hissaby_cached_recurring', JSON.stringify(updated));
    setSuccessToast(`Deleted ${name}.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  const handlePostToLedger = async (item: RecurringItem) => {
    setPostingId(item.id);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${apiUrl}/api/dashboard/recurring/${item.id}/post`, {
        method: 'POST',
        headers
      });

      if (res.ok) {
        setSuccessToast(`Posted ${item.name} (${item.currencySymbol || currentCurrency.symbol}${item.amount.toLocaleString()}) to Transactions Ledger!`);
        setTimeout(() => setSuccessToast(null), 4000);
      } else {
        setErrorToast('Could not post to transactions ledger.');
        setTimeout(() => setErrorToast(null), 3000);
      }
    } catch {
      setErrorToast('Network error posting to transactions ledger.');
      setTimeout(() => setErrorToast(null), 3000);
    } finally {
      setPostingId(null);
    }
  };

  // Metrics Calculation
  const activeItems = items.filter(i => i.isActive);
  const totalMonthlyOutflow = activeItems
    .filter(i => !i.isIncome)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalMonthlyInflow = activeItems
    .filter(i => i.isIncome)
    .reduce((acc, curr) => acc + curr.amount, 0);

  const netRecurringBalance = totalMonthlyInflow - totalMonthlyOutflow;

  const currentDay = new Date().getDate();
  const upcomingIn7Days = activeItems.filter(i => {
    const diff = i.dueDay - currentDay;
    return diff >= 0 && diff <= 7;
  });

  const filteredItems = items.filter(i => {
    if (filterTab === 'expense') return !i.isIncome;
    if (filterTab === 'income') return i.isIncome;
    return true;
  });

  return (
    <div className="space-y-8 pb-16 w-full animate-fadeIn">
      {/* Toast Notifications */}
      {successToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="font-bold ml-2 text-emerald-700">Dismiss</button>
        </div>
      )}

      {errorToast && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-2xl flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorToast}</span>
          </div>
          <button onClick={() => setErrorToast(null)} className="font-bold ml-2 text-rose-700">Dismiss</button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[#5391FE] text-xs font-bold uppercase tracking-wider mb-1">
            <Repeat className="w-4 h-4" />
            <span>Fixed Cashflow &amp; Commitments</span>
          </div>
          <h2 className="text-2xl font-black text-[#012456] tracking-tight">
            Recurring Money Manager
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Automate and track your fixed monthly obligations: Rent, Salary, Pocket Money, Utilities, and Subscriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormName('');
            setFormAmount('');
            setFormIsIncome(false);
            setFormCategory('Housing');
            setFormFrequency('Monthly');
            setFormDueDay(1);
            setFormNotes('');
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all cursor-pointer hover:shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Add Recurring Obligation</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Outflow */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fixed Monthly Outflow</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#012456] tracking-tight">
              {formatAmount(totalMonthlyOutflow)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Rent, pocket money, bills &amp; fees
            </p>
          </div>
        </div>

        {/* Inflow */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Fixed Monthly Inflow</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-600 tracking-tight">
              +{formatAmount(totalMonthlyInflow)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Salary, allowances &amp; retainers
            </p>
          </div>
        </div>

        {/* Net Cash Surplus */}
        <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Net Recurring Surplus</span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netRecurringBalance >= 0 ? 'bg-blue-50 text-[#5391FE]' : 'bg-rose-50 text-rose-500'
            }`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl font-black tracking-tight ${
              netRecurringBalance >= 0 ? 'text-[#012456]' : 'text-rose-600'
            }`}>
              {netRecurringBalance >= 0 ? '+' : ''}{formatAmount(netRecurringBalance)}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Remaining after fixed commitments
            </p>
          </div>
        </div>

        {/* Upcoming Count */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-white to-blue-50/40 border border-[#5391FE]/30 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#5391FE] uppercase tracking-wider">Due in Next 7 Days</span>
            <div className="w-8 h-8 rounded-xl bg-[#5391FE] text-white flex items-center justify-center shadow-xs">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-[#012456] tracking-tight">
              {upcomingIn7Days.length} Obligations
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Upcoming scheduled payments
            </p>
          </div>
        </div>
      </div>

      {/* 1-Click Common Presets Bar */}
      <div className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-[#012456] uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
            <span>Quick-Add Popular Presets</span>
          </span>
          <span className="text-[11px] text-slate-400">Click any preset to configure instantly</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          {PRESET_TEMPLATES.map((tmpl) => {
            const Icon = tmpl.icon;
            return (
              <button
                key={tmpl.name}
                type="button"
                onClick={() => handleOpenPreset(tmpl)}
                className="px-3 py-2 rounded-xl bg-slate-50 hover:bg-blue-50/80 border border-slate-200 hover:border-[#5391FE]/50 text-xs font-semibold text-slate-700 hover:text-[#5391FE] transition-all flex items-center gap-2 cursor-pointer shadow-2xs group"
              >
                <Icon className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#5391FE]" />
                <span>{tmpl.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({currentCurrency.symbol}{tmpl.amount.toLocaleString()})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main List Section with Filter Tabs */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            {[
              { id: 'all', label: `All Items (${items.length})` },
              { id: 'expense', label: `Expenses & Bills (${items.filter(i => !i.isIncome).length})` },
              { id: 'income', label: `Income & Salary (${items.filter(i => i.isIncome).length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterTab === tab.id
                    ? 'bg-[#012456] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-400">
            Current Day of Month: <strong className="text-slate-700">{currentDay}th</strong>
          </span>
        </div>

        {/* Empty State */}
        {filteredItems.length === 0 ? (
          <div className="py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
              <Calendar className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-[#012456]">No Recurring Items Added Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Add your monthly rent, salary, pocket money, or utility bills above to keep your monthly cashflow fully automated.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredItems.map((item) => {
              const diffDays = item.dueDay - currentDay;
              const isDueToday = diffDays === 0;
              const isDueSoon = diffDays > 0 && diffDays <= 5;
              
              return (
                <div
                  key={item.id}
                  className={`p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 group ${
                    item.isIncome 
                      ? 'bg-white border-emerald-100 hover:border-emerald-300' 
                      : 'bg-white border-slate-200 hover:border-[#5391FE]/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        item.isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-[#5391FE]'
                      }`}>
                        {item.isIncome ? <ArrowUpRight className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-[#012456] flex items-center gap-2">
                          <span>{item.name}</span>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${
                            item.isIncome ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {item.frequency}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {item.category} • Due on the <strong className="text-slate-700">{item.dueDay}th</strong> of every month
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className={`text-base font-black ${item.isIncome ? 'text-emerald-600' : 'text-[#012456]'}`}>
                        {item.isIncome ? '+' : '-'}{item.currencySymbol || currentCurrency.symbol}{item.amount.toLocaleString()}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${
                        isDueToday 
                          ? 'bg-rose-100 text-rose-700 animate-pulse' 
                          : isDueSoon 
                            ? 'bg-amber-100 text-amber-800' 
                            : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isDueToday ? 'Due Today!' : isDueSoon ? `Due in ${diffDays} days` : `Due in ${diffDays < 0 ? 30 + diffDays : diffDays} days`}
                      </span>
                    </div>
                  </div>

                  {item.notes && (
                    <p className="text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      {item.notes}
                    </p>
                  )}

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      disabled={postingId === item.id}
                      onClick={() => handlePostToLedger(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#5391FE] hover:text-white text-slate-700 font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Post this item directly to your live transactions ledger"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{postingId === item.id ? 'Posting...' : 'Post to Ledger'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id, item.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove this recurring item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="relative w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
                  <Repeat className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#012456]">
                    Configure Recurring Commitment
                  </h3>
                  <p className="text-xs text-slate-400">
                    Rent, Salary, Pocket Money, Utilities &amp; Subscriptions
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4">
              {/* Income vs Expense Radio */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFormIsIncome(false)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    !formIsIncome ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Expense / Outflow
                </button>
                <button
                  type="button"
                  onClick={() => setFormIsIncome(true)}
                  className={`py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                    formIsIncome ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  Income / Inflow
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Obligation Title *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Apartment Rent, Monthly Pocket Money, PTCL Wi-Fi"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Amount ({currentCurrency.symbol}) *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  step="any"
                  value={formAmount}
                  onChange={(e) => setFormAmount(e.target.value)}
                  placeholder="e.g. 35000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 font-bold"
                />
              </div>

              {/* Frequency & Due Day */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Frequency
                  </label>
                  <select
                    value={formFrequency}
                    onChange={(e) => setFormFrequency(e.target.value as any)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] bg-white"
                  >
                    <option value="Monthly">Monthly</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Yearly">Yearly</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Due Day of Month (1 - 31)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formDueDay}
                    onChange={(e) => setFormDueDay(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                  />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE] bg-white"
                >
                  <option value="Housing">Housing &amp; Rent</option>
                  <option value="Salary & Income">Salary &amp; Income</option>
                  <option value="Personal & Family">Personal &amp; Pocket Money</option>
                  <option value="Utilities">Utilities (Electricity, Gas, Water, Net)</option>
                  <option value="Education">Education &amp; Tuition</option>
                  <option value="Transport">Transport &amp; Car Installments</option>
                  <option value="Subscriptions">Subscriptions &amp; Software</option>
                  <option value="Health">Health &amp; Insurance</option>
                  <option value="General">General Recurring</option>
                </select>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Optional Notes
                </label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="e.g. Transfer directly via online banking on 1st"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold shadow-sm transition-all cursor-pointer hover:shadow-md"
                >
                  Save Recurring Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecurringMoneyView;
