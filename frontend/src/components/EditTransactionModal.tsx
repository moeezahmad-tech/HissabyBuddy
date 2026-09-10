import React, { useState, useEffect } from 'react';
import { X, Pencil, ArrowUpRight, ArrowDownRight, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { appStorage, STORAGE_KEYS } from '../services/appStorage';

export interface EditableTransaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  payee?: string;
  purpose?: string;
  currency?: string;
  currencySymbol?: string;
}

interface EditTransactionModalProps {
  isOpen: boolean;
  transaction: EditableTransaction | null;
  onClose: () => void;
  onSuccess: (updatedTx: EditableTransaction) => void;
}

const CATEGORIES = [
  'Food & Groceries',
  'Shopping & Retail',
  'Rent & Housing',
  'Utilities & Bills',
  'Transportation & Fuel',
  'Health & Medical',
  'Education & Learning',
  'Salary & Income',
  'Business & Freelance',
  'Investments',
  'Loan / Debt',
  'Entertainment & Leisure',
  'Other'
];

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { currentCurrency } = useCurrency();

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [isCredit, setIsCredit] = useState(false); // true = Income (+), false = Expense (-)
  const [category, setCategory] = useState('Food & Groceries');
  const [payee, setPayee] = useState('');
  const [purpose, setPurpose] = useState('');
  const [date, setDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !transaction) return;
    setName(transaction.name || '');
    const absAmt = Math.abs(transaction.amount);
    setAmount(absAmt.toString());
    setIsCredit(transaction.amount > 0);
    setCategory(transaction.category || 'Food & Groceries');
    setPayee(transaction.payee || '');
    setPurpose(transaction.purpose || '');
    setDate(transaction.date || new Date().toISOString().split('T')[0]);
    setError(null);
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmt = parseFloat(amount);
    if (!name.trim()) {
      setError('Please provide a transaction title.');
      return;
    }
    if (isNaN(parsedAmt) || parsedAmt <= 0) {
      setError('Please provide a valid amount greater than 0.');
      return;
    }

    setLoading(true);
    const finalAmount = isCredit ? parsedAmt : -parsedAmt;

    const updatedTx: EditableTransaction = {
      ...transaction,
      name: name.trim(),
      amount: finalAmount,
      category,
      payee: payee.trim() || undefined,
      purpose: purpose.trim() || undefined,
      date: date || transaction.date,
    };

    try {
      // 1. Update local synchronous appStorage (0ms instant UI update)
      const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
      const updatedList = cachedTxs.map((t) => (t.id === transaction.id ? { ...t, ...updatedTx } : t));
      appStorage.save(STORAGE_KEYS.TRANSACTIONS, updatedList);

      // 2. Sync to backend asynchronously
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
      if (user?.uid) headers['X-User-Id'] = user.uid;

      fetch(`${apiUrl}/api/dashboard/transactions/${transaction.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          name: updatedTx.name,
          amount: updatedTx.amount,
          category: updatedTx.category,
          payee: updatedTx.payee,
          purpose: updatedTx.purpose,
          date: updatedTx.date,
        }),
      }).catch(() => null);

      onSuccess(updatedTx);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update transaction.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center border border-blue-100">
              <Pencil className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#012456] tracking-tight">
                Edit Transaction
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {transaction.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Type Toggle: Income vs Expense */}
          <div>
            <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
              Flow Direction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsCredit(false)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  !isCredit
                    ? 'border-rose-300 bg-rose-50 text-rose-700 ring-2 ring-rose-200/50'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowDownRight className="w-4 h-4 text-rose-600" />
                <span>Expense (-)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCredit(true)}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isCredit
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200/50'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                <span>Income / Money In (+)</span>
              </button>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">
              Title / Description *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
            />
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Amount ({currentCurrency.code || 'PKR'}) *
              </label>
              <input
                type="number"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-[#5391FE]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Payee & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Payee / Sender</label>
              <input
                type="text"
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="e.g. Bank, Usman, Store"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. 10 Sep 2026"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
              />
            </div>
          </div>

          {/* Notes / Purpose */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Purpose</label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Additional notes or tags"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditTransactionModal;
