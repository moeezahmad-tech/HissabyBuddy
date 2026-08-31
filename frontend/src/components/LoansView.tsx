import React, { useState, useEffect } from 'react';
import { 
  HandCoins, 
  PlusCircle, 
  ArrowUpRight, 
  ArrowDownLeft, 
  CheckCircle2, 
  Clock, 
  Calendar, 
  X, 
  Trash2, 
  CreditCard,
  Search,
  ReceiptText
} from 'lucide-react';
import { useCurrency } from '../context/CurrencyContext';

export interface RepaymentRecord {
  id: string;
  amount: number;
  date: string;
  notes?: string;
}

export interface LoanItem {
  id: string;
  type: 'lent' | 'borrowed'; // lent = I gave money (receivable); borrowed = I took money (payable)
  personName: string;
  contact?: string;
  amount: number;
  repaidAmount: number;
  startDate: string;
  dueDate?: string;
  category: 'Personal' | 'Family' | 'Business' | 'Bank / EMI' | 'Emergency' | 'Other';
  notes?: string;
  status: 'active' | 'settled';
  repayments: RepaymentRecord[];
  createdAt: string;
}

const STORAGE_KEY = 'hissaby_loans_records_v2';
const MOCK_KEYWORDS = ['hamza', 'meezan', 'usman', 'colleague', 'personal facility'];

export const LoansView: React.FC = () => {
  const { formatAmount, currentCurrency } = useCurrency();

  const [loans, setLoans] = useState<LoanItem[]>(() => {
    try {
      // Unconditionally purge legacy storage key that may have cached mock loans in browser
      localStorage.removeItem('hissaby_loans_records_v1');
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(l => 
            !MOCK_KEYWORDS.some(k => l.personName?.toLowerCase().includes(k)) &&
            !l.id.startsWith('loan-')
          );
        }
      }
    } catch {}
    return [];
  });

  // Ensure any cached in-memory mock records are purged on mount
  useEffect(() => {
    try {
      localStorage.removeItem('hissaby_loans_records_v1');
    } catch {}
    setLoans(prev => prev.filter(l => 
      !MOCK_KEYWORDS.some(k => l.personName?.toLowerCase().includes(k)) &&
      !l.id.startsWith('loan-')
    ));
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loans));
    } catch {}
  }, [loans]);

  // Filters & Search
  const [filterType, setFilterType] = useState<'all' | 'lent' | 'borrowed' | 'settled'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repayingLoan, setRepayingLoan] = useState<LoanItem | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState('');
  const [repaymentNotes, setRepaymentNotes] = useState('');

  // Add Loan Form state
  const [formType, setFormType] = useState<'lent' | 'borrowed'>('lent');
  const [formName, setFormName] = useState('');
  const [formContact, setFormContact] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formStartDate, setFormStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [formDueDate, setFormDueDate] = useState('');
  const [formCategory, setFormCategory] = useState<LoanItem['category']>('Personal');
  const [formNotes, setFormNotes] = useState('');

  // Calculations
  const totalLentRemaining = loans
    .filter(l => l.type === 'lent')
    .reduce((sum, l) => sum + (l.amount - l.repaidAmount), 0);

  const totalBorrowedRemaining = loans
    .filter(l => l.type === 'borrowed')
    .reduce((sum, l) => sum + (l.amount - l.repaidAmount), 0);

  const netPosition = totalLentRemaining - totalBorrowedRemaining;
  const activeLoansCount = loans.filter(l => l.status === 'active').length;

  const filteredLoans = loans.filter(item => {
    if (filterType === 'lent' && item.type !== 'lent') return false;
    if (filterType === 'borrowed' && item.type !== 'borrowed') return false;
    if (filterType === 'settled' && item.status !== 'settled') return false;
    if (filterType === 'all' && item.status === 'settled') return false; // Show active by default in 'all'

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.personName.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchName || matchNotes || matchCategory;
    }
    return true;
  });

  const handleAddLoan = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(formAmount);
    if (!formName.trim() || isNaN(amt) || amt <= 0) return;

    const newLoan: LoanItem = {
      id: 'loan-' + Date.now(),
      type: formType,
      personName: formName.trim(),
      contact: formContact.trim() || undefined,
      amount: amt,
      repaidAmount: 0,
      startDate: formStartDate || new Date().toISOString().split('T')[0],
      dueDate: formDueDate || undefined,
      category: formCategory,
      notes: formNotes.trim() || undefined,
      status: 'active',
      repayments: [],
      createdAt: new Date().toISOString()
    };

    setLoans(prev => [newLoan, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setFormName('');
    setFormContact('');
    setFormAmount('');
    setFormDueDate('');
    setFormNotes('');
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayingLoan) return;
    const payment = parseFloat(repaymentAmount);
    if (isNaN(payment) || payment <= 0) return;

    const remaining = repayingLoan.amount - repayingLoan.repaidAmount;
    const actualPay = Math.min(payment, remaining);

    const record: RepaymentRecord = {
      id: 'rep-' + Date.now(),
      amount: actualPay,
      date: new Date().toISOString().split('T')[0],
      notes: repaymentNotes.trim() || undefined
    };

    setLoans(prev => prev.map(l => {
      if (l.id !== repayingLoan.id) return l;
      const newRepaid = l.repaidAmount + actualPay;
      const newStatus = newRepaid >= l.amount ? 'settled' : 'active';
      return {
        ...l,
        repaidAmount: newRepaid,
        status: newStatus,
        repayments: [record, ...l.repayments]
      };
    }));

    setRepayingLoan(null);
    setRepaymentAmount('');
    setRepaymentNotes('');
  };

  const handleMarkSettled = (id: string) => {
    setLoans(prev => prev.map(l => {
      if (l.id !== id) return l;
      const remaining = l.amount - l.repaidAmount;
      const finalRepayment: RepaymentRecord = {
        id: 'rep-' + Date.now(),
        amount: remaining,
        date: new Date().toISOString().split('T')[0],
        notes: 'Marked fully settled'
      };
      return {
        ...l,
        repaidAmount: l.amount,
        status: 'settled',
        repayments: remaining > 0 ? [finalRepayment, ...l.repayments] : l.repayments
      };
    }));
  };

  const handleDeleteLoan = (id: string) => {
    if (window.confirm('Are you sure you want to delete this loan record?')) {
      setLoans(prev => prev.filter(l => l.id !== id));
    }
  };

  return (
    <div className="space-y-8 pb-16 w-full max-w-6xl mx-auto font-sans">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[#5391FE] text-xs font-bold uppercase tracking-wider mb-1">
            <HandCoins className="w-4 h-4" />
            <span>Debt &amp; Udhaar Ledger</span>
          </div>
          <h2 className="text-2xl font-black text-[#012456] tracking-tight">
            Loans &amp; Debts
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Track money you lent to others and loans you borrowed with installment progress
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2.5 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all shadow-xs hover:shadow-md flex items-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Loan Record</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Money Lent (Receivable) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Owed to You (Lent)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-600 tracking-tight">
              {formatAmount(totalLentRemaining)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              From {loans.filter(l => l.type === 'lent' && l.status === 'active').length} active borrower(s)
            </p>
          </div>
        </div>

        {/* Card 2: Money Borrowed (Payable) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              You Owe (Borrowed)
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-rose-600 tracking-tight">
              {formatAmount(totalBorrowedRemaining)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              To {loans.filter(l => l.type === 'borrowed' && l.status === 'active').length} lender(s) / bank(s)
            </p>
          </div>
        </div>

        {/* Card 3: Net Debt Position */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Net Debt Position
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              netPosition >= 0 ? 'bg-blue-50 text-[#5391FE]' : 'bg-amber-50 text-amber-600'
            }`}>
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              netPosition >= 0 ? 'text-[#012456]' : 'text-rose-600'
            }`}>
              {formatAmount(Math.abs(netPosition))}
            </div>
            <p className="text-[11px] font-semibold mt-1">
              {netPosition >= 0 ? (
                <span className="text-emerald-600">Net Surplus (Receivable &gt; Debt)</span>
              ) : (
                <span className="text-rose-600">Net Payable Deficit</span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Active Commitments */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Active Commitments
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-black text-[#012456] tracking-tight">
              {activeLoansCount} <span className="text-xs font-normal text-slate-400">active</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {loans.filter(l => l.status === 'settled').length} fully settled loans
            </p>
          </div>
        </div>

      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        
        {/* Type Switcher */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl gap-1 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterType('all')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'all'
                ? 'bg-white text-[#012456] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            All Active ({loans.filter(l => l.status === 'active').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('lent')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'lent'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Money Lent ({loans.filter(l => l.type === 'lent').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('borrowed')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'borrowed'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Borrowed ({loans.filter(l => l.type === 'borrowed').length})
          </button>

          <button
            type="button"
            onClick={() => setFilterType('settled')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              filterType === 'settled'
                ? 'bg-white text-[#012456] shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Fully Settled ({loans.filter(l => l.status === 'settled').length})
          </button>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search person or bank..."
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all shadow-2xs"
          />
        </div>

      </div>

      {/* Loans List Grid */}
      {filteredLoans.length === 0 ? (
        <div className="p-12 text-center bg-white border border-dashed border-slate-200 rounded-3xl">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center mx-auto mb-3">
            <HandCoins className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#012456]">
            {loans.length === 0 ? 'No Loans or Debts Recorded Yet' : 'No Loans Match This Filter'}
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery
              ? `No records found matching "${searchQuery}".`
              : 'Record money you have lent to others (receivables) or money you borrowed (payables) to track installments and balances.'}
          </p>
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold hover:bg-[#437de0] transition-colors cursor-pointer"
          >
            + Add Loan Record
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLoans.map(loan => {
            const remaining = Math.max(loan.amount - loan.repaidAmount, 0);
            const percentPaid = Math.min(Math.round((loan.repaidAmount / loan.amount) * 100), 100);
            const isLent = loan.type === 'lent';

            return (
              <div
                key={loan.id}
                className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-5 relative group"
              >
                <div>
                  {/* Top Bar with Type Badge & Category */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1 ${
                      isLent
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}>
                      {isLent ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {isLent ? 'Lent (Receivable)' : 'Borrowed (Payable)'}
                    </span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold text-slate-400 px-2 py-0.5 rounded-lg bg-slate-50 border border-slate-100">
                        {loan.category}
                      </span>
                      <button
                        onClick={() => handleDeleteLoan(loan.id)}
                        title="Delete Record"
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-500 transition-opacity cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Person or Institution Name */}
                  <h3 className="text-base font-black text-[#012456] tracking-tight truncate">
                    {loan.personName}
                  </h3>

                  {loan.contact && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {loan.contact}
                    </p>
                  )}

                  {/* Amount Breakdown */}
                  <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Principal Amount</span>
                      <span className="font-bold text-[#012456]">{formatAmount(loan.amount)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium">Repaid so far</span>
                      <span className="font-bold text-emerald-600">{formatAmount(loan.repaidAmount)}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60">
                      <span className="font-bold text-slate-700">Remaining Balance</span>
                      <span className={`font-black ${isLent ? 'text-emerald-700' : 'text-rose-600'}`}>
                        {formatAmount(remaining)}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          percentPaid >= 100 ? 'bg-emerald-500' : isLent ? 'bg-emerald-500' : 'bg-[#5391FE]'
                        }`}
                        style={{ width: `${percentPaid}%` }}
                      />
                    </div>
                    <div className="text-[10px] text-right font-bold text-slate-400">
                      {percentPaid}% Repaid
                    </div>
                  </div>

                  {/* Dates & Purpose */}
                  <div className="mt-3.5 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>Started: {loan.startDate}</span>
                      {loan.dueDate && (
                        <span className="text-slate-400 ml-1">
                          • Due: <strong className="text-slate-700">{loan.dueDate}</strong>
                        </span>
                      )}
                    </div>

                    {loan.notes && (
                      <p className="text-[11px] text-slate-500 italic mt-1 line-clamp-2">
                        "{loan.notes}"
                      </p>
                    )}
                  </div>

                  {/* Repayment History Summary if exists */}
                  {loan.repayments && loan.repayments.length > 0 && (
                    <div className="mt-3 pt-2.5 border-t border-slate-100">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                        Recent Payment History ({loan.repayments.length})
                      </span>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {loan.repayments.slice(0, 2).map((rep) => (
                          <div key={rep.id} className="flex items-center justify-between text-[11px] text-slate-600">
                            <span className="truncate max-w-[140px] text-slate-400">{rep.date}: {rep.notes || 'Payment'}</span>
                            <span className="font-bold text-emerald-600">+{formatAmount(rep.amount)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

                {/* Bottom Action Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {loan.status === 'active' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setRepayingLoan(loan)}
                        className="flex-1 py-2 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#5391FE] text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <ReceiptText className="w-3.5 h-3.5" />
                        <span>Record Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleMarkSettled(loan.id)}
                        title="Mark as 100% Fully Settled"
                        className="p-2 rounded-xl bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border border-slate-200 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full py-1.5 text-center text-xs font-bold text-emerald-600 bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Fully Settled &amp; Paid Off</span>
                    </div>
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Add New Loan */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-base font-black text-[#012456] flex items-center gap-2">
                <HandCoins className="w-5 h-5 text-[#5391FE]" />
                New Loan / Udhaar Record
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLoan} className="space-y-4">
              
              {/* Type Switcher: Lent vs Borrowed */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Record Type
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setFormType('lent')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'lent'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>I Lent Money</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormType('borrowed')}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      formType === 'borrowed'
                        ? 'bg-white text-rose-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5" />
                    <span>I Borrowed</span>
                  </button>
                </div>
              </div>

              {/* Person / Counterparty Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formType === 'lent' ? 'Borrower (Who owes you?)' : 'Lender (Who do you owe?)'} *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g. Ali Raza or HBL Bank"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20"
                />
              </div>

              {/* Amount */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Total Principal Amount ({currentCurrency.symbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  value={formAmount}
                  onChange={e => setFormAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 font-mono font-bold"
                />
              </div>

              {/* Category & Contact Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Family">Family</option>
                    <option value="Business">Business</option>
                    <option value="Bank / EMI">Bank / EMI</option>
                    <option value="Emergency">Emergency</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Contact / Note</label>
                  <input
                    type="text"
                    value={formContact}
                    onChange={e => setFormContact(e.target.value)}
                    placeholder="Phone or reference"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date (Optional)</label>
                  <input
                    type="date"
                    value={formDueDate}
                    onChange={e => setFormDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                  />
                </div>
              </div>

              {/* Purpose Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Purpose / Notes</label>
                <input
                  type="text"
                  value={formNotes}
                  onChange={e => setFormNotes(e.target.value)}
                  placeholder="e.g. For semester fees, car installment"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Save Loan Record
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Record Repayment */}
      {repayingLoan && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-sm w-full p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-black text-[#012456]">
                  Record Repayment
                </h3>
                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                  For {repayingLoan.personName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRepayingLoan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500">Remaining Balance:</span>
              <span className="font-black text-[#012456]">
                {formatAmount(repayingLoan.amount - repayingLoan.repaidAmount)}
              </span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Amount ({currentCurrency.symbol}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  min="1"
                  max={repayingLoan.amount - repayingLoan.repaidAmount}
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(e.target.value)}
                  placeholder={`Max ${repayingLoan.amount - repayingLoan.repaidAmount}`}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-mono font-bold focus:outline-hidden focus:border-[#5391FE]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Note / Reference
                </label>
                <input
                  type="text"
                  value={repaymentNotes}
                  onChange={e => setRepaymentNotes(e.target.value)}
                  placeholder="e.g. Cash, Bank Transfer, EasyPaisa"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:border-[#5391FE]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setRepayingLoan(null)}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LoansView;
