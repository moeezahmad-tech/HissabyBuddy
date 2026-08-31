import React, { useEffect, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Inbox, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import AllTransactionsModal from './AllTransactionsModal';

interface Transaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  status: 'Completed' | 'Pending' | string;
  payee?: string;
  purpose?: string;
  invoiceNumber?: string;
  currency?: string;
  currencySymbol?: string;
  source?: string;
}

export const RecentTransactionsTable: React.FC = () => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_transactions');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isAllModalOpen, setIsAllModalOpen] = useState<boolean>(false);

  const fetchTransactions = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      if (user?.uid) {
        headers['X-User-Id'] = user.uid;
      }
      const res = await fetch(`${apiUrl}/api/dashboard/transactions`, {
        headers,
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(15000) : undefined,
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const txList = data?.transactions || [];
        localStorage.setItem('hissaby_cached_transactions', JSON.stringify(txList));
        setTransactions(txList);
      } else if (res && !res.ok) {
        const errJson = await res.json().catch(() => ({ error: 'Failed to fetch transactions' }));
        setError(errJson.error || 'Server error loading transaction records.');
      }
    } catch {
      // Keep cached transactions on network issues
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user]);

  return (
    <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-[#012456] tracking-tight">
            Recent Transactions
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Latest income and expense records
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-3">
            <button
              onClick={fetchTransactions}
              disabled={loading}
              title="Refresh Transactions"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#012456] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button 
              type="button"
              onClick={() => setIsAllModalOpen(true)}
              className="text-xs font-bold text-[#5391FE] hover:text-[#012456] flex items-center gap-1 transition-colors cursor-pointer"
            >
              <span>View All Transactions</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button 
            onClick={fetchTransactions}
            className="text-xs font-bold text-rose-700 hover:underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading && transactions.length === 0 ? (
        <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 text-[#5391FE] animate-spin" />
          <span>Loading synchronized transactions...</span>
        </div>
      ) : transactions.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#012456]">No Transactions Logged Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {user
              ? 'Upload PDF bank statements in the Document Upload zone or log transactions in Firestore to see your ledger.'
              : 'Please sign in with Google to view and manage your isolated financial ledger.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="pb-3">Transaction</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Date &amp; Time</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {transactions.map((tx) => {
                const isDebit = tx.amount < 0;
                return (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                        }`}>
                          {isDebit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{tx.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                            <span className="font-mono text-slate-400">{tx.id}</span>
                            {tx.payee && (
                              <span>• Payee: <strong className="text-slate-700">{tx.payee}</strong></span>
                            )}
                            {tx.purpose && (
                              <span className="hidden sm:inline text-slate-500 truncate max-w-xs">({tx.purpose})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-semibold text-[11px]">
                        {tx.category}
                      </span>
                    </td>
                    <td className="py-4 text-slate-500">{tx.date}</td>
                    <td className="py-4">
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        {tx.status}
                      </span>
                    </td>
                    <td className={`py-4 text-right font-black ${
                      isDebit ? 'text-rose-600' : 'text-emerald-600'
                    }`}>
                      {tx.currencySymbol ? (
                        `${isDebit ? '-' : '+'}${tx.currencySymbol}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      ) : tx.currency ? (
                        `${isDebit ? '-' : '+'}${tx.currency} ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                      ) : (
                        formatAmount(tx.amount, true)
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Full Transactions Modal */}
      <AllTransactionsModal
        isOpen={isAllModalOpen}
        onClose={() => {
          setIsAllModalOpen(false);
          fetchTransactions();
        }}
      />
    </div>
  );
};

export default RecentTransactionsTable;
