import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  Inbox, 
  AlertCircle, 
  RefreshCw, 
  HandCoins, 
  CheckCircle2,
  MoreVertical,
  Pencil,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { useToast } from '../context/ToastContext';
import { appStorage, STORAGE_KEYS } from '../services/appStorage';
import MoveToLoanModal, { type MoveTransactionData } from './MoveToLoanModal';
import EditTransactionModal, { type EditableTransaction } from './EditTransactionModal';
import { ConfirmModal } from './ConfirmModal';
import type { LoanItem } from './LoansView';

interface Transaction {
  id: string;
  name: string;
  category: string;
  date: string;
  amount: number;
  status?: 'Completed' | 'Pending' | string;
  payee?: string;
  purpose?: string;
  invoiceNumber?: string;
  currency?: string;
  currencySymbol?: string;
  source?: string;
}

export const RecentTransactionsTable: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatAmount } = useCurrency();

  const toast = useToast();

  // Instant 0ms render from synchronous cache
  const [transactions, setTransactions] = useState<Transaction[]>(() =>
    appStorage.getInitial<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, [])
  );
  const [loans, setLoans] = useState<LoanItem[]>(() =>
    appStorage.getInitial<LoanItem[]>(STORAGE_KEYS.LOANS, [])
  );
  const [loading, setLoading] = useState<boolean>(() => transactions.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [movingTx, setMovingTx] = useState<MoveTransactionData | null>(null);
  const [editingTx, setEditingTx] = useState<EditableTransaction | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<{
    tx: Transaction;
    top: number;
    right: number;
    openUpwards: boolean;
  } | null>(null);
  const [txToDelete, setTxToDelete] = useState<Transaction | null>(null);
  const [isDeletingTx, setIsDeletingTx] = useState(false);
  const [showClearAllConfirm, setShowClearAllConfirm] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);
  const [movedToLoanIds, setMovedToLoanIds] = useState<string[]>(() =>
    appStorage.getInitial<string[]>(STORAGE_KEYS.MOVED_TO_LOAN_IDS, [])
  );

  const handleOpenMenu = (e: React.MouseEvent<HTMLButtonElement>, tx: Transaction) => {
    e.stopPropagation();
    if (menuAnchor?.tx.id === tx.id) {
      setMenuAnchor(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuHeight = 155;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUpwards = spaceBelow < menuHeight && rect.top > menuHeight;

    setMenuAnchor({
      tx,
      top: openUpwards ? rect.top - 6 : rect.bottom + 6,
      right: Math.max(12, window.innerWidth - rect.right),
      openUpwards,
    });
  };

  const isMoved = (tx: Transaction) => {
    // 1. Explicitly recorded in movedToLoanIds or tagged on object
    if ((tx as any).movedToLoan || movedToLoanIds.includes(tx.id)) return true;

    // 2. Category, name, or purpose indicates loan / udhaar
    const cat = (tx.category || '').toLowerCase();
    const name = (tx.name || '').toLowerCase();
    const purpose = (tx.purpose || '').toLowerCase();
    if (
      cat.includes('loan') || cat.includes('debt') || cat.includes('udhaar') ||
      name.includes('loan') || name.includes('debt') || name.includes('udhaar') ||
      purpose.includes('loan') || purpose.includes('debt') || purpose.includes('udhaar')
    ) {
      return true;
    }

    // 3. Smart cross-reference: matches existing loans or repayments in ledger
    const absTxAmt = Math.abs(tx.amount);
    if (absTxAmt > 0 && loans && loans.length > 0) {
      const matchesAnyLoan = loans.some((l) => {
        // Matches loan principal or any combined sub-item
        const matchesPrincipal = Math.abs(l.amount - absTxAmt) < 0.01;
        const matchesSubItem = (l.breakdown || []).some((b) => Math.abs(b.amount - absTxAmt) < 0.01);
        // Matches any installment/repayment record (e.g. 1,800)
        const matchesRepayment = (l.repayments || []).some(
          (r) => Math.abs(r.amount - absTxAmt) < 0.01
        );
        return matchesPrincipal || matchesSubItem || matchesRepayment;
      });
      if (matchesAnyLoan) return true;
    }

    return false;
  };

  const fetchTransactions = async () => {
    // Only show blocking loading state if no cached data exists
    if (transactions.length === 0) {
      setLoading(true);
    }
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
        signal: typeof AbortSignal !== 'undefined' && 'timeout' in AbortSignal ? AbortSignal.timeout(10000) : undefined,
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json().catch(() => null);
        const txList = data?.transactions || [];
        // Persist to both localStorage and IndexedDB
        appStorage.save(STORAGE_KEYS.TRANSACTIONS, txList);
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

  const fetchLoans = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
      if (user?.uid) headers['X-User-Id'] = user.uid;
      const res = await fetch(`${apiUrl}/api/dashboard/loans`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success' && Array.isArray(data.loans)) {
          setLoans(data.loans);
          appStorage.save(STORAGE_KEYS.LOANS, data.loans);
        }
      }
    } catch {}
  };

  const handleDeleteTransaction = (tx: Transaction) => {
    setMenuAnchor(null);
    setTxToDelete(tx);
  };

  const handleConfirmDeleteTransaction = async () => {
    if (!txToDelete) return;
    const tx = txToDelete;
    setIsDeletingTx(true);

    const filtered = transactions.filter((t) => t.id !== tx.id);
    setTransactions(filtered);
    appStorage.save(STORAGE_KEYS.TRANSACTIONS, filtered);
    toast.success(`Transaction "${tx.name}" deleted successfully.`, {
      title: 'Transaction Deleted',
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
      if (user?.uid) headers['X-User-Id'] = user.uid;
      await fetch(`${apiUrl}/api/dashboard/transactions/${encodeURIComponent(tx.id)}`, {
        method: 'DELETE',
        headers,
      });
    } catch {} finally {
      setIsDeletingTx(false);
      setTxToDelete(null);
    }
  };

  const handleConfirmClearAll = async () => {
    setIsClearingAll(true);
    setTransactions([]);
    appStorage.save(STORAGE_KEYS.TRANSACTIONS, []);
    appStorage.save(STORAGE_KEYS.MOVED_TO_LOAN_IDS, []);
    toast.success('All transaction history cleared and balance reset to Rs 0.00.', {
      title: 'History Cleared',
    });

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
      if (user?.uid) headers['X-User-Id'] = user.uid;
      await fetch(`${apiUrl}/api/dashboard/transactions`, {
        method: 'DELETE',
        headers,
      });
    } catch {} finally {
      setIsClearingAll(false);
      setShowClearAllConfirm(false);
    }
  };

  useEffect(() => {
    // Check IndexedDB if localStorage was empty or partitioned
    appStorage.hydrateFromIndexedDB<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, (dbTxs) => {
      if (dbTxs && dbTxs.length > 0 && transactions.length === 0) {
        setTransactions(dbTxs);
      }
    });

    appStorage.hydrateFromIndexedDB<string[]>(STORAGE_KEYS.MOVED_TO_LOAN_IDS, (dbMoved) => {
      if (dbMoved && Array.isArray(dbMoved)) {
        setMovedToLoanIds(dbMoved);
      }
    });

    appStorage.hydrateFromIndexedDB<LoanItem[]>(STORAGE_KEYS.LOANS, (dbLoans) => {
      if (dbLoans && Array.isArray(dbLoans) && dbLoans.length > 0) {
        setLoans(dbLoans);
      }
    });

    // Subscribe to cross-view updates
    const unsubscribe = appStorage.subscribe<Transaction[]>(STORAGE_KEYS.TRANSACTIONS, (newTxs) => {
      if (Array.isArray(newTxs)) {
        setTransactions(newTxs);
      }
    });

    const unsubMoved = appStorage.subscribe<string[]>(STORAGE_KEYS.MOVED_TO_LOAN_IDS, (ids) => {
      if (Array.isArray(ids)) {
        setMovedToLoanIds(ids);
      }
    });

    const unsubLoans = appStorage.subscribe<LoanItem[]>(STORAGE_KEYS.LOANS, (newLoans) => {
      if (Array.isArray(newLoans)) {
        setLoans(newLoans);
      }
    });

    const handleCloseMenu = () => {
      setMenuAnchor(null);
    };
    window.addEventListener('click', handleCloseMenu);
    window.addEventListener('resize', handleCloseMenu);
    window.addEventListener('scroll', handleCloseMenu, true);

    fetchTransactions();
    fetchLoans();

    return () => {
      unsubscribe();
      unsubMoved();
      unsubLoans();
      window.removeEventListener('click', handleCloseMenu);
      window.removeEventListener('resize', handleCloseMenu);
      window.removeEventListener('scroll', handleCloseMenu, true);
    };
  }, [user]);

  return (
    <div className="p-4 sm:p-8 rounded-3xl bg-white border border-slate-200 shadow-xs overflow-hidden transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-xl font-black text-[#012456] tracking-tight">
            Transaction History
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Full record of incoming money and outgoing expenditures
          </p>
        </div>
        {user && (
          <div className="flex items-center gap-2 sm:gap-3">
            {transactions.length > 0 && (
              <button
                type="button"
                onClick={() => setShowClearAllConfirm(true)}
                disabled={loading || isClearingAll}
                title="Clear all transaction history"
                className="px-3 py-1.5 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                <span>Clear History</span>
              </button>
            )}
            <button
              onClick={() => {
                fetchTransactions();
                fetchLoans();
              }}
              disabled={loading}
              title="Refresh Transactions"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-[#012456] hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
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
              ? 'Upload PDF bank statements in the Document Upload zone or log transactions to see where money came from and went.'
              : 'Please sign in to view and manage your isolated financial ledger.'}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Native Card View (Visible on small screens) */}
          <div className="sm:hidden divide-y divide-slate-100">
            {transactions.map((tx) => {
              const isDebit = tx.amount < 0;
              const formattedAmt = tx.currencySymbol ? (
                `${isDebit ? '-' : '+'}${tx.currencySymbol}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              ) : tx.currency ? (
                `${isDebit ? '-' : '+'}${tx.currency} ${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
              ) : (
                formatAmount(tx.amount, true)
              );

              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      isDebit ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {isDebit ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-900 text-xs truncate">{tx.name}</p>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                        <span className="font-semibold text-slate-700">
                          {isDebit ? (tx.payee ? `To: ${tx.payee}` : 'Money Out') : (tx.payee ? `From: ${tx.payee}` : 'Money In')}
                        </span>
                        <span>•</span>
                        <span className="truncate">{tx.category}</span>
                        <span>•</span>
                        <span>{tx.date}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className={`text-xs font-black ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {formattedAmt}
                      </p>
                      {isMoved(tx) && (
                        <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-blue-700 bg-blue-50 border border-blue-200 mt-0.5">
                          ✓ In Loans
                        </span>
                      )}
                    </div>

                    {/* 3-Dots Action Button on Mobile */}
                    <button
                      type="button"
                      onClick={(e) => handleOpenMenu(e, tx)}
                      className={`p-1.5 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                        menuAnchor?.tx.id === tx.id
                          ? 'bg-slate-100 border-slate-300 text-slate-800'
                          : 'border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                      }`}
                      title="Options"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop & Tablet Table View (Hidden on small screens) */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3">Transaction</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Date &amp; Time</th>
                  <th className="pb-3 text-right">Amount</th>
                  <th className="pb-3 w-8"></th>
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
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900">{tx.name}</p>
                              {isMoved(tx) && (
                                <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold border border-blue-200 inline-flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-blue-600" />
                                  <span>In Loans</span>
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium mt-0.5">
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

                      {/* 3-Dots Action Button on Desktop (Zero excess column width, no layout stretching) */}
                      <td className="py-4 pl-1 pr-0 text-right w-8">
                        <button
                          type="button"
                          onClick={(e) => handleOpenMenu(e, tx)}
                          className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                            menuAnchor?.tx.id === tx.id
                              ? 'bg-slate-100 border-slate-300 text-slate-800 shadow-xs'
                              : 'border-transparent text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 hover:border-slate-200'
                          }`}
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Floating 3-Dots Action Menu (Mounted via Portal into document.body: overflows freely, 0 layout footprint, never triggers table scrollbars) */}
      {menuAnchor && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            top: menuAnchor.openUpwards ? undefined : `${menuAnchor.top}px`,
            bottom: menuAnchor.openUpwards ? `${window.innerHeight - menuAnchor.top}px` : undefined,
            right: `${menuAnchor.right}px`,
            zIndex: 99999,
          }}
          onClick={(e) => e.stopPropagation()}
          className="w-48 rounded-2xl bg-white border border-slate-200 shadow-2xl py-1.5 text-xs font-semibold animate-in fade-in zoom-in-95 duration-150 ring-1 ring-black/5"
        >
          {isMoved(menuAnchor.tx) ? (
            <button
              type="button"
              onClick={() => {
                setMenuAnchor(null);
                navigate('/dashboard/loans');
              }}
              className="w-full px-3.5 py-2 text-left text-blue-600 hover:bg-blue-50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>View in Loans</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                const targetTx = menuAnchor.tx;
                setMenuAnchor(null);
                setMovingTx(targetTx);
              }}
              className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
            >
              <HandCoins className="w-4 h-4 text-[#5391FE] shrink-0" />
              <span>Move to Loans</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              const targetTx = menuAnchor.tx;
              setMenuAnchor(null);
              setEditingTx(targetTx as any);
            }}
            className="w-full px-3.5 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Pencil className="w-4 h-4 text-slate-500 shrink-0" />
            <span>Edit Details</span>
          </button>

          <div className="my-1 border-t border-slate-100" />

          <button
            type="button"
            onClick={() => {
              const targetTx = menuAnchor.tx;
              setMenuAnchor(null);
              handleDeleteTransaction(targetTx);
            }}
            className="w-full px-3.5 py-2 text-left text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Trash2 className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Delete Entry</span>
          </button>
        </div>,
        document.body
      )}

      {/* Move to Loan Modal */}
      <MoveToLoanModal
        isOpen={Boolean(movingTx)}
        transaction={movingTx}
        onClose={() => setMovingTx(null)}
        onSuccess={(msg) => {
          toast.success(msg || 'Transaction moved into Loans & Debts successfully!', {
            title: 'Moved to Loans',
            action: {
              label: 'Go to Loans',
              onClick: () => navigate('/dashboard/loans'),
            },
          });
          fetchTransactions();
          fetchLoans();
        }}
      />

      {/* Edit Transaction Modal */}
      <EditTransactionModal
        isOpen={Boolean(editingTx)}
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={(updated) => {
          toast.success(`Updated "${updated.name}" successfully.`, { title: 'Transaction Updated' });
          fetchTransactions();
        }}
      />

      {/* Custom Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(txToDelete)}
        onClose={() => {
          if (!isDeletingTx) setTxToDelete(null);
        }}
        onConfirm={handleConfirmDeleteTransaction}
        title="Delete Transaction"
        message={
          txToDelete ? (
            <span>
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white font-semibold">"{txToDelete.name}"</strong> ({formatAmount(txToDelete.amount)})? This will remove the record.
            </span>
          ) : null
        }
        confirmText="Delete Transaction"
        isLoading={isDeletingTx}
        variant="danger"
      />

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearAllConfirm}
        onClose={() => {
          if (!isClearingAll) setShowClearAllConfirm(false);
        }}
        onConfirm={handleConfirmClearAll}
        title="Clear All Transaction History"
        message={
          <span>
            Are you sure you want to delete all <strong className="text-slate-900 dark:text-white font-semibold">{transactions.length} transactions</strong>? This will wipe your ledger history and reset your Total Balance to Rs 0.00.
          </span>
        }
        confirmText="Clear All History"
        isLoading={isClearingAll}
        variant="danger"
      />
    </div>
  );
};

export default RecentTransactionsTable;
