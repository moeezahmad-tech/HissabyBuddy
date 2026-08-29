import React, { useState } from 'react';
import { PlusCircle, Sparkles } from 'lucide-react';
import KPICards from './KPICards';
import SpendingTrendsChart from './SpendingTrendsChart';
import DailySpendingChart from './DailySpendingChart';
import RecentTransactionsTable from './RecentTransactionsTable';
import QuickTransactionModal from './QuickTransactionModal';

export const DashboardView: React.FC = () => {
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8 pb-12 w-full">
      
      {/* Dashboard Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-black text-[#012456] tracking-tight">
            Financial Dashboard &amp; Analytics
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cashflow intelligence, OCR statements, and AI financial tracking
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#5391FE] border border-blue-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
            <span>AI Text Entry</span>
          </button>

          <button
            type="button"
            onClick={() => setIsQuickModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Manual Logs</span>
          </button>
        </div>
      </div>

      {/* 1. Metric KPI Overview Cards */}
      <section aria-label="Key Performance Indicators" key={`kpi-${refreshKey}`}>
        <KPICards />
      </section>

      {/* 2. Dual Analytics Charts Grid: Day-Wise Activity & Category Breakdown */}
      <section aria-label="Financial Trends & Velocity" className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start" key={`charts-${refreshKey}`}>
        <DailySpendingChart />
        <SpendingTrendsChart />
      </section>

      {/* 3. Recent Transactions Table */}
      <section aria-label="Recent Financial Activity" key={`table-${refreshKey}`}>
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
