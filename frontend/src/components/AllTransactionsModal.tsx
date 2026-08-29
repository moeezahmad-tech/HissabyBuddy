import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  Inbox, 
  Receipt,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface Transaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  status: string;
  payee?: string;
  purpose?: string;
  invoiceNumber?: string;
  currency?: string;
  currencySymbol?: string;
  source?: string;
}

interface AllTransactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllTransactionsModal: React.FC<AllTransactionsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { formatAmount, currentCurrency } = useCurrency();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    if (!isOpen) return;

    const fetchAll = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = {};
        if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

        const res = await fetch(`${apiUrl}/api/dashboard/transactions`, { headers });
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.transactions || []);
        }
      } catch {
        // ignore
      }
    };

    fetchAll();
  }, [isOpen, user]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach(t => {
      if (t.category) set.add(t.category);
    });
    return ['All', ...Array.from(set)];
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchesSearch = 
        t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.payee && t.payee.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.purpose && t.purpose.toLowerCase().includes(searchQuery.toLowerCase())) ||
        t.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = 
        filterType === 'all' ? true :
        filterType === 'income' ? t.amount > 0 :
        t.amount < 0;

      const matchesCategory = 
        selectedCategory === 'All' ? true : t.category === selectedCategory;

      return matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, searchQuery, filterType, selectedCategory]);

  const totalInflow = useMemo(() => {
    return filteredTransactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
  }, [filteredTransactions]);

  const totalOutflow = useMemo(() => {
    return filteredTransactions.filter(t => t.amount < 0).reduce((acc, t) => acc + Math.abs(t.amount), 0);
  }, [filteredTransactions]);

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) return;

    const headers = ['Transaction ID', 'Description', 'Category', 'Date', 'Type', 'Amount', 'Currency', 'Payee', 'Purpose', 'Status'];
    const rows = filteredTransactions.map(t => [
      t.id,
      `"${t.name.replace(/"/g, '""')}"`,
      `"${t.category}"`,
      t.date,
      t.amount >= 0 ? 'Credit/Income' : 'Debit/Expense',
      Math.abs(t.amount).toFixed(2),
      t.currency || currentCurrency.code,
      `"${(t.payee || '').replace(/"/g, '""')}"`,
      `"${(t.purpose || '').replace(/"/g, '""')}"`,
      t.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-[#012456]">
                All Financial Transactions Ledger
              </h3>
              <p className="text-xs text-slate-400">
                {transactions.length} total recorded items • Live Firestore &amp; OCR records
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCSV}
              disabled={filteredTransactions.length === 0}
              className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Export filtered records as CSV spreadsheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="py-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search transactions by item name, payee, purpose, ID..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
              />
            </div>

            {/* Type Filter Buttons */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setFilterType('all')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setFilterType('income')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'income' ? 'bg-white text-emerald-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setFilterType('expense')}
                className={`flex-1 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  filterType === 'expense' ? 'bg-white text-rose-600 shadow-2xs' : 'text-slate-500'
                }`}
              >
                Expenses
              </button>
            </div>
          </div>

          {/* Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[10px] text-slate-400 font-bold uppercase shrink-0">Category:</span>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-[#5391FE] text-white font-bold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Ledger Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-emerald-700 block">Total Inflow / Salary</span>
            <span className="text-sm font-black text-emerald-800 mt-0.5 block">+{formatAmount(totalInflow)}</span>
          </div>

          <div className="p-3 bg-rose-50/70 border border-rose-100 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-rose-700 block">Total Outflow / Expenses</span>
            <span className="text-sm font-black text-rose-800 mt-0.5 block">-{formatAmount(totalOutflow)}</span>
          </div>

          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-blue-700 block">Net Activity Balance</span>
            <span className={`text-sm font-black mt-0.5 block ${totalInflow >= totalOutflow ? 'text-emerald-700' : 'text-rose-700'}`}>
              {totalInflow >= totalOutflow ? '+' : '-'}{formatAmount(Math.abs(totalInflow - totalOutflow))}
            </span>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-200 min-h-60">
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center">
              <Inbox className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-600">No Transactions Found</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Try changing your search terms or filter criteria.</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4">Transaction Details</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredTransactions.map((tx) => {
                  const isDebit = tx.amount < 0;
                  const sym = tx.currencySymbol || currentCurrency.symbol;
                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                            isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {isDebit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-tight">{tx.name}</p>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                              <span className="font-mono">{tx.id}</span>
                              {tx.payee && <span>• {tx.payee}</span>}
                              {tx.purpose && <span className="hidden sm:inline">({tx.purpose})</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-semibold">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">{tx.date}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                          <CheckCircle2 className="w-3 h-3" />
                          {tx.status || 'Verified'}
                        </span>
                      </td>
                      <td className={`py-3 px-4 text-right font-black whitespace-nowrap ${
                        isDebit ? 'text-rose-600' : 'text-emerald-600'
                      }`}>
                        {isDebit ? '-' : '+'}{sym}{Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 mt-3">
          <span>Showing {filteredTransactions.length} of {transactions.length} total entries</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Close Ledger
          </button>
        </div>

      </div>
    </div>
  );
};

export default AllTransactionsModal;
