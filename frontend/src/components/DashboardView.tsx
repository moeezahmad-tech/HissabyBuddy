import React, { useState } from 'react';
import { PlusCircle, Sparkles } from 'lucide-react';
import KPICards from './KPICards';
import RecentTransactionsTable from './RecentTransactionsTable';
import QuickTransactionModal from './QuickTransactionModal';

export const DashboardView: React.FC = () => {
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 w-full">
      
      {/* Dashboard Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-[#012456] tracking-tight">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cashflow, statements, and AI tracking
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#5391FE] border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs active:scale-95"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
            <span>AI Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Log Transaction</span>
          </button>
        </div>
      </div>

      {/* 1. Metric KPI Overview Cards (Total Balance, Monthly Spend, Loans to Pay) */}
      <section aria-label="Key Performance Indicators" key={`kpi-${refreshKey}`}>
        <KPICards />
      </section>

      {/* 2. Complete Transaction History List (Where money came from & where it goes) */}
      <section aria-label="Transaction History List" key={`table-${refreshKey}`}>
        <RecentTransactionsTable />
      </section>

      {/* Quick Transaction & Salary Modal */}
      <QuickTransactionModal
        isOpen={isQuickModalOpen}
        onClose={() => setIsQuickModalOpen(false)}
        onSuccess={handleTransactionAdded}
      />

    </div>
  );
};

export default DashboardView;
