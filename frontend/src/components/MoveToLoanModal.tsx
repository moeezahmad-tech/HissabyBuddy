import React, { useState, useEffect } from 'react';
import { 
  X, 
  HandCoins, 
  ArrowRight, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  Clock, 
  PlusCircle, 
  User, 
  Calendar, 
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { appStorage, STORAGE_KEYS } from '../services/appStorage';
import type { LoanItem, RepaymentRecord, LoanSubItem } from './LoansView';
import { normalizePersonName, consolidateLoans } from './LoansView';

export interface MoveTransactionData {
  id: string;
  name: string;
  category?: string;
  date: string;
  amount: number;
  payee?: string;
  purpose?: string;
  currency?: string;
  currencySymbol?: string;
}

interface MoveToLoanModalProps {
  isOpen: boolean;
  transaction: MoveTransactionData | null;
  onClose: () => void;
  onSuccess: (message?: string) => void;
}

export const MoveToLoanModal: React.FC<MoveToLoanModalProps> = ({
  isOpen,
  transaction,
  onClose,
  onSuccess,
}) => {
  const { user } = useAuth();
  const { formatAmount, currentCurrency } = useCurrency();

  // Existing loans from appStorage / state
  const [existingLoans, setExistingLoans] = useState<LoanItem[]>([]);
  const [activeTab, setActiveTab] = useState<'new_loan' | 'repay_loan'>('new_loan');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form: New Loan
  const [loanType, setLoanType] = useState<'lent' | 'borrowed'>('borrowed');
  const [personName, setPersonName] = useState('');
  const [contact, setContact] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<LoanItem['category']>('Personal');
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form: Repay existing loan
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');

  // Options
  const [removeFromLedger, setRemoveFromLedger] = useState(true);

  // Load existing loans and prefill transaction details when modal opens
  useEffect(() => {
    if (!isOpen || !transaction) return;

    // Load active loans from unified cache
    const cached = appStorage.getInitial<LoanItem[]>(STORAGE_KEYS.LOANS, []);
    setExistingLoans(cached || []);

    const absAmt = Math.abs(transaction.amount);
    setAmount(absAmt.toString());

    // Guess default loan type based on transaction flow
    // Positive (+20000) means money came in -> Borrowed (received a loan)
    // Negative (-1800) means money went out -> Lent (gave loan) OR Repayment
    if (transaction.amount > 0) {
      setLoanType('borrowed');
      setActiveTab('new_loan');
    } else {
      // If it's an outgoing payment and active loans exist, highlight repayment option
      const hasActiveLoans = (cached || []).some(l => l.status === 'active');
      if (hasActiveLoans) {
        setActiveTab('repay_loan');
        const firstActive = (cached || []).find(l => l.status === 'active');
        if (firstActive) setSelectedLoanId(firstActive.id);
      } else {
        setLoanType('lent');
        setActiveTab('new_loan');
      }
    }

    // Prefill person name from payee or title
    const guessName = transaction.payee || transaction.name || '';
    const cleaned = guessName.replace(/^(Money In|Money Out|Payment|Deposit|Transfer)\s*[-:]?\s*/i, '');
    setPersonName(normalizePersonName(cleaned));
    setNotes(transaction.purpose || transaction.name || '');
    setError(null);
  }, [isOpen, transaction]);

  if (!isOpen || !transaction) return null;

  const isDebit = transaction.amount < 0;
  const activeLoans = existingLoans.filter(l => l.status === 'active');
  const selectedLoan = activeLoans.find(l => l.id === selectedLoanId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsedAmount = parseFloat(amount);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setError('Please provide a valid loan or repayment amount.');
      return;
    }

    if (activeTab === 'new_loan' && !personName.trim()) {
      setError('Please enter the name of the borrower, lender, or institution.');
      return;
    }

    if (activeTab === 'repay_loan' && !selectedLoanId) {
      setError('Please select an active loan to apply this repayment to.');
      return;
    }

    setSubmitting(true);

    try {
      let updatedLoans = [...existingLoans];
      const cleanName = normalizePersonName(personName);

      if (activeTab === 'new_loan') {
        const existingIdx = updatedLoans.findIndex(
          (l) => normalizePersonName(l.personName) === cleanName && l.type === loanType && l.status === 'active'
        );

        if (existingIdx !== -1) {
          // Combine with existing loan!
          const existing = updatedLoans[existingIdx];
          const newSubItem: LoanSubItem = {
            id: 'sub-' + Date.now(),
            amount: parsedAmount,
            date: transaction.date || new Date().toISOString().split('T')[0],
            notes: notes.trim() || transaction.name || undefined,
            category,
          };
          const newBreakdown = [
            ...(existing.breakdown || [
              {
                id: existing.id,
                amount: existing.amount,
                date: existing.startDate,
                notes: existing.notes,
                category: existing.category,
              },
            ]),
            newSubItem,
          ];
          const totalAmount = newBreakdown.reduce((sum, b) => sum + b.amount, 0);
          const combinedNotes = [existing.notes, notes.trim() || transaction.name].filter(Boolean).join(' • ');

          const merged: LoanItem = {
            ...existing,
            personName: cleanName,
            amount: totalAmount,
            dueDate: dueDate || existing.dueDate,
            contact: contact.trim() || existing.contact,
            notes: combinedNotes || undefined,
            breakdown: newBreakdown,
          };
          updatedLoans = updatedLoans.map((l, idx) => (idx === existingIdx ? merged : l));
        } else {
          const newLoan: LoanItem = {
            id: 'loan-' + Date.now(),
            type: loanType,
            personName: cleanName,
            contact: contact.trim() || undefined,
            amount: parsedAmount,
            repaidAmount: 0,
            startDate: transaction.date || new Date().toISOString().split('T')[0],
            dueDate: dueDate || undefined,
            category,
            notes: notes.trim() || undefined,
            status: 'active',
            repayments: [],
            createdAt: new Date().toISOString(),
            breakdown: [
              {
                id: 'sub-' + Date.now(),
                amount: parsedAmount,
                date: transaction.date || new Date().toISOString().split('T')[0],
                notes: notes.trim() || transaction.name || undefined,
                category,
              },
            ],
          };
          updatedLoans = [newLoan, ...updatedLoans];
        }
      } else if (activeTab === 'repay_loan' && selectedLoan) {
        const remaining = selectedLoan.amount - selectedLoan.repaidAmount;
        const actualPay = Math.min(parsedAmount, remaining);
        const record: RepaymentRecord = {
          id: 'rep-' + Date.now(),
          amount: actualPay,
          date: transaction.date || new Date().toISOString().split('T')[0],
          notes: notes.trim() || `Transferred from Transaction (${transaction.name})`,
        };

        updatedLoans = updatedLoans.map((l) => {
          if (l.id !== selectedLoan.id) return l;
          const newRepaid = l.repaidAmount + actualPay;
          const newStatus: 'active' | 'settled' = newRepaid >= l.amount ? 'settled' : 'active';
          return {
            ...l,
            repaidAmount: newRepaid,
            status: newStatus,
            repayments: [record, ...l.repayments],
          };
        });
      }

      // 1. Run through consolidateLoans & save to client dual-storage
      const consolidated = consolidateLoans(updatedLoans);
      appStorage.save(STORAGE_KEYS.LOANS, consolidated);

      // 2. Mark this transaction ID as moved to loan
      const currentMovedIds = appStorage.getInitial<string[]>(STORAGE_KEYS.MOVED_TO_LOAN_IDS, []);
      if (!currentMovedIds.includes(transaction.id)) {
        appStorage.save(STORAGE_KEYS.MOVED_TO_LOAN_IDS, [...currentMovedIds, transaction.id]);
      }

      // 3. Remove transaction from ledger if requested, or tag as moved
      const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
      if (removeFromLedger) {
        const filteredTxs = cachedTxs.filter((t) => t.id !== transaction.id);
        appStorage.save(STORAGE_KEYS.TRANSACTIONS, filteredTxs);
      } else {
        const taggedTxs = cachedTxs.map((t) =>
          t.id === transaction.id ? { ...t, movedToLoan: true, category: 'Loan / Debt' } : t
        );
        appStorage.save(STORAGE_KEYS.TRANSACTIONS, taggedTxs);
      }

      // 4. Sync to backend API asynchronously
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;
      if (user?.uid) headers['X-User-Id'] = user.uid;

      fetch(`${apiUrl}/api/dashboard/transactions/convert-to-loan`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          transactionId: transaction.id,
          actionType: activeTab,
          loanType,
          personName: personName.trim() || undefined,
          contact: contact.trim() || undefined,
          category,
          dueDate: dueDate || undefined,
          targetLoanId: selectedLoanId || undefined,
          amount: parsedAmount,
          date: transaction.date,
          notes: notes.trim() || undefined,
          removeFromLedger,
        }),
      }).catch(() => null);

      onSuccess(
        activeTab === 'new_loan'
          ? `Successfully moved into new ${loanType === 'borrowed' ? 'Borrowed Debt' : 'Lent Loan'} for ${personName}!`
          : `Applied ${currentCurrency.symbol || 'Rs '}${parsedAmount.toLocaleString()} repayment towards ${selectedLoan?.personName}'s loan!`
      );
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to move transaction to loans.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 via-white to-indigo-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100/80 text-[#5391FE] flex items-center justify-center shadow-xs">
              <HandCoins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#012456] tracking-tight">
                Move to Loans &amp; Debts
              </h3>
              <p className="text-xs text-slate-500">
                Transfer recorded entry into Udhaar / Loan tracking
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

        {/* Selected Transaction Pill Summary */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              isDebit ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'
            }`}>
              {isDebit ? <ArrowDownRight className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-800 truncate">{transaction.name}</p>
              <p className="text-[10px] text-slate-400 font-mono">{transaction.date} • {transaction.id}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`font-black text-sm ${isDebit ? 'text-rose-600' : 'text-emerald-600'}`}>
              {isDebit ? '-' : '+'}{transaction.currencySymbol || currentCurrency.symbol || 'Rs '}{Math.abs(transaction.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-2 mx-5 sm:mx-6 mt-4 bg-slate-100/80 rounded-2xl grid grid-cols-2 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('new_loan')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'new_loan'
                ? 'bg-white text-[#012456] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#5391FE]" />
            <span>Create New Loan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('repay_loan')}
            className={`py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'repay_loan'
                ? 'bg-white text-[#012456] shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Pay Existing Loan ({activeLoans.length})</span>
          </button>
        </div>

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'new_loan' ? (
            <>
              {/* Type: Lent vs Borrowed */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Loan Direction
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setLoanType('borrowed')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      loanType === 'borrowed'
                        ? 'border-blue-400 bg-blue-50/70 shadow-xs ring-2 ring-blue-400/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#012456]">I Borrowed (Udhaar Liya)</span>
                      <ArrowDownRight className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      You received money as a loan that you must pay back
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLoanType('lent')}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                      loanType === 'lent'
                        ? 'border-emerald-400 bg-emerald-50/70 shadow-xs ring-2 ring-emerald-400/20'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-xs text-[#012456]">I Lent (Udhaar Diya)</span>
                      <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      You gave money to someone that they will repay to you
                    </p>
                  </button>
                </div>
              </div>

              {/* Person Name & Contact */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    {loanType === 'borrowed' ? 'Lender / From Whom *' : 'Borrower / To Whom *'}
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={personName}
                      onChange={(e) => setPersonName(e.target.value.toUpperCase())}
                      placeholder="e.g. FATHER, MEEZAN BANK, HAMZA"
                      required
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 uppercase font-semibold focus:outline-none focus:border-[#5391FE]"
                    />
                  </div>
                  {personName.trim() && existingLoans.some(l => normalizePersonName(l.personName) === normalizePersonName(personName) && l.type === loanType && l.status === 'active') && (
                    <div className="mt-1.5 p-2 rounded-xl bg-blue-50 border border-blue-200 text-[10px] text-blue-700 font-medium flex items-center gap-1.5 animate-in fade-in duration-150">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-blue-600" />
                      <span>An active record for <strong>{normalizePersonName(personName)}</strong> exists. Moving this transaction will combine into their existing loan account.</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Contact / Phone (Optional)</label>
                  <input
                    type="text"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="e.g. +92 300 1234567"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
                  />
                </div>
              </div>

              {/* Amount & Category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Loan Amount ({currentCurrency.code || 'PKR'})
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
                    onChange={(e) => setCategory(e.target.value as LoanItem['category'])}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Family">Family</option>
                    <option value="Business">Business</option>
                    <option value="Bank / EMI">Bank / EMI</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Due Date & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Due / Repayment Date</label>
                  <div className="relative">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Purpose</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="e.g. Advance salary, emergency medical"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Repaying Existing Loan */}
              {activeLoans.length === 0 ? (
                <div className="py-8 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <AlertCircle className="w-7 h-7 text-amber-500 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-800">No Active Loans Found</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                    You don't have any open loans in your ledger yet. Switch to the <strong>Create New Loan</strong> tab above to record this as a new loan obligation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new_loan')}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-blue-50 text-[#5391FE] border border-blue-200 text-xs font-bold hover:bg-blue-100 cursor-pointer"
                  >
                    Switch to Create New Loan
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1.5">
                      Select Loan to Pay Off:
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {activeLoans.map((loan) => {
                        const remaining = loan.amount - loan.repaidAmount;
                        const isSelected = selectedLoanId === loan.id;
                        return (
                          <div
                            key={loan.id}
                            onClick={() => setSelectedLoanId(loan.id)}
                            className={`p-3 rounded-2xl border text-xs transition-all cursor-pointer ${
                              isSelected
                                ? 'border-[#5391FE] bg-blue-50/70 ring-2 ring-blue-400/20'
                                : 'border-slate-200 hover:bg-slate-50 bg-white'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  loan.type === 'lent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                }`}>
                                  {loan.type === 'lent' ? 'I Lent' : 'I Borrowed'}
                                </span>
                                <span className="font-bold text-slate-900">{loan.personName}</span>
                              </div>
                              <span className="font-mono text-slate-400 text-[10px]">{loan.category}</span>
                            </div>

                            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                              <span>Total: {formatAmount(loan.amount)}</span>
                              <span className="font-bold text-[#012456]">
                                Remaining: <strong className="text-rose-600 font-black">{formatAmount(remaining)}</strong>
                              </span>
                            </div>

                            {/* Progress bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                              <div 
                                className="bg-emerald-500 h-full rounded-full transition-all"
                                style={{ width: `${Math.min(100, Math.round((loan.repaidAmount / loan.amount) * 100))}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Payment Amount */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Repayment Amount
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
                      <label className="text-xs font-bold text-slate-700 block mb-1">Repayment Note</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="e.g. Installment 1 of 3"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                  </div>

                  {/* Calculation Preview Banner */}
                  {selectedLoan && (
                    <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
                      <div>
                        <p className="font-bold">Repayment Preview for {selectedLoan.personName}</p>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          New Remaining Balance: <strong>{formatAmount(Math.max(0, (selectedLoan.amount - selectedLoan.repaidAmount) - parseFloat(amount || '0')))}</strong>
                          {parseFloat(amount || '0') >= (selectedLoan.amount - selectedLoan.repaidAmount) && ' • Will be Fully Settled! 🎉'}
                        </p>
                      </div>
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Remove from Transaction History toggle */}
          <div className="pt-2 border-t border-slate-100">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={removeFromLedger}
                onChange={(e) => setRemoveFromLedger(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded text-[#5391FE] border-slate-300 focus:ring-[#5391FE]"
              />
              <div className="text-xs">
                <span className="font-bold text-slate-800">Remove from Transaction History after moving</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Recommended: prevents double-counting loan capital or repayments in regular monthly spending and income totals.
                </p>
              </div>
            </label>
          </div>

          {/* Action Footer */}
          <div className="pt-4 flex items-center justify-end gap-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting || (activeTab === 'repay_loan' && activeLoans.length === 0)}
              className="px-5 py-2.5 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  <span>Confirm &amp; Move to Loans</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MoveToLoanModal;
