import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, Sparkles } from 'lucide-react';
import KPICards from './KPICards';
import DailySpendingChart from './DailySpendingChart';
import RecentTransactionsTable from './RecentTransactionsTable';
import QuickTransactionModal from './QuickTransactionModal';
import DashboardTeamSnapshot from './DashboardTeamSnapshot';

interface DashboardViewProps {
  onNavigateTeams?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTeams }) => {
  const navigate = useNavigate();
  const [isQuickModalOpen, setIsQuickModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleNavigateTeams = onNavigateTeams || (() => navigate('/dashboard/teams'));

  const handleTransactionAdded = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-8 pb-12 w-full">
      
      {/* Dashboard Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-xl font-black text-[#012456] tracking-tight">
            Financial Overview
          </h2>
          <p className="text-xs text-slate-500">
            Real-time cashflow, statements, and AI tracking
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

      {/* 2. Daily Spending Chart */}
      <section aria-label="Daily Spending Activity" key={`charts-${refreshKey}`}>
        <DailySpendingChart />
      </section>

      {/* 3. Collaborative Groups & Shared Money Snapshot */}
      <section aria-label="Shared Collaborative Budgets" key={`teams-${refreshKey}`}>
        <DashboardTeamSnapshot onNavigateTeams={handleNavigateTeams} />
      </section>

      {/* 4. Recent Transactions Table */}
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
