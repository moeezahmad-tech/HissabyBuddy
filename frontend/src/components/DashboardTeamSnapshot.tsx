import React, { useState, useEffect } from 'react';
import {
  Users, Plus, ShoppingBag, Briefcase, Home,
  ChevronRight, Wallet, TrendingDown, ArrowDownLeft
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';
import { teamService, type Workspace } from '../services/teamService';

interface DashboardTeamSnapshotProps {
  onNavigateTeams: () => void;
}

// ── Theme helpers ──────────────────────────────────────────────────────────────
function getThemeIcon(theme?: string) {
  switch (theme) {
    case 'family':  return <ShoppingBag className="w-4 h-4 text-emerald-500" />;
    case 'project': return <Briefcase className="w-4 h-4 text-blue-500" />;
    case 'friends': return <Home className="w-4 h-4 text-purple-500" />;
    default:        return <Users className="w-4 h-4 text-purple-500" />;
  }
}

function getThemeBg(theme?: string) {
  switch (theme) {
    case 'family':  return 'bg-emerald-50 border-emerald-100';
    case 'project': return 'bg-blue-50 border-blue-100';
    default:        return 'bg-purple-50 border-purple-100';
  }
}

function getThemeLabel(theme?: string) {
  switch (theme) {
    case 'family':  return 'Family';
    case 'project': return 'Project';
    case 'friends': return 'Roommates';
    default:        return 'Team';
  }
}

// ── Component ──────────────────────────────────────────────────────────────────
export const DashboardTeamSnapshot: React.FC<DashboardTeamSnapshotProps> = ({ onNavigateTeams }) => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(() => {
    return teamService.getStoredWorkspaces();
  });

  useEffect(() => {
    teamService.getWorkspaces(user?.token).then((data) => {
      if (data && data.length > 0) setWorkspaces(data);
    });
  }, [user]);

  const count = workspaces.length;

  // ── Dynamic grid class based on group count ────────────────────────────────
  // 0 groups → 1 col (create card = full width)
  // 1 group  → 2 col (group + create = 50/50)
  // 2 groups → 3 col on md+ (G G Create in one row)
  // 3+       → 2 col sm, 3 col md, 4 col xl (wraps naturally; create is last card)
  const gridClass =
    count === 0 ? 'grid-cols-1' :
    count === 1 ? 'grid-cols-2' :
    count === 2 ? 'grid-cols-2 md:grid-cols-3' :
                  'grid-cols-2 md:grid-cols-3 xl:grid-cols-4';

  return (
    <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">

      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Collaborative Groups</span>
          <h4 className="text-base font-black text-[#012456] tracking-tight">Shared Budgets</h4>
        </div>
        {count > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-[#5391FE] border border-blue-100">
              {count} {count === 1 ? 'Group' : 'Groups'}
            </span>
            <button type="button" onClick={onNavigateTeams}
              className="text-xs font-bold text-[#5391FE] hover:text-[#012456] flex items-center gap-0.5 transition-colors cursor-pointer">
              Manage <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Card Grid */}
      <div className={`grid gap-3 ${gridClass}`}>

        {/* Group Cards */}
        {workspaces.map((ws) => {
          const memberCount = ws.members?.length || ws.member_count || 1;
          const totalBudget = ws.total_budget || 0;
          const totalSpent = ws.total_spent || (ws.spendings?.reduce((acc, s) => acc + s.amount, 0) || 0);
          const remaining = totalBudget - totalSpent;
          const budgetUsagePercent = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
          const isOver = remaining < 0;

          return (
            <div key={ws.id}
              className="relative p-4 rounded-2xl bg-slate-50 border border-slate-200 hover:border-[#5391FE]/50 hover:shadow-sm transition-all group flex flex-col gap-3 cursor-pointer"
              onClick={onNavigateTeams}
            >
              {/* Card Top: icon + name + badge */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${getThemeBg(ws.theme)}`}>
                    {getThemeIcon(ws.theme)}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#012456] truncate leading-tight">{ws.name}</p>
                    <p className="text-[9px] text-slate-400 mt-0.5">{memberCount} {memberCount === 1 ? 'member' : 'members'}</p>
                  </div>
                </div>
                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold uppercase shrink-0 border ${
                  ws.theme === 'family' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  ws.theme === 'project' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                  'bg-purple-50 text-purple-700 border-purple-200'
                }`}>{getThemeLabel(ws.theme)}</span>
              </div>

              {/* Metric Row */}
              <div className="grid grid-cols-3 gap-1.5">
                <div className="p-1.5 rounded-xl bg-white border border-slate-100 text-center">
                  <Wallet className="w-2.5 h-2.5 text-slate-300 mx-auto mb-0.5" />
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">Budget</span>
                  <span className="text-[10px] font-black text-[#012456] block leading-tight">
                    {totalBudget > 0 ? formatAmount(totalBudget, false, 'Rs ').replace('Rs ', '') : '0'}
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-white border border-slate-100 text-center">
                  <TrendingDown className="w-2.5 h-2.5 text-rose-300 mx-auto mb-0.5" />
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">Spent</span>
                  <span className="text-[10px] font-black text-rose-600 block leading-tight">
                    {formatAmount(totalSpent, false, 'Rs ').replace('Rs ', '')}
                  </span>
                </div>
                <div className="p-1.5 rounded-xl bg-white border border-slate-100 text-center">
                  <ArrowDownLeft className={`w-2.5 h-2.5 mx-auto mb-0.5 ${isOver ? 'text-rose-300' : 'text-emerald-300'}`} />
                  <span className="text-[8px] font-bold text-slate-400 block uppercase">Left</span>
                  <span className={`text-[10px] font-black block leading-tight ${totalBudget === 0 ? 'text-slate-500 font-bold' : isOver ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {totalBudget > 0 ? formatAmount(Math.abs(remaining), false, 'Rs ').replace('Rs ', '') : 'No Cap'}
                  </span>
                </div>
              </div>

              {/* Budget Progress Bar */}
              {totalBudget > 0 && (
                <div>
                  <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${budgetUsagePercent > 85 ? 'bg-rose-500' : 'bg-[#5391FE]'}`}
                      style={{ width: `${budgetUsagePercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-slate-400">{budgetUsagePercent}% used</span>
                    {isOver && <span className="text-[8px] font-bold text-rose-500">Over budget</span>}
                  </div>
                </div>
              )}

              {/* View button (appears on hover) */}
              <div className="flex items-center justify-end">
                <span className="text-[9px] font-bold text-slate-400 group-hover:text-[#5391FE] transition-colors flex items-center gap-0.5">
                  View <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          );
        })}

        {/* ── Create New Group Card ──────────────────────────────────────── */}
        <button
          type="button"
          onClick={onNavigateTeams}
          className={`flex flex-col items-center justify-center gap-2.5 p-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-[#5391FE]/60 hover:bg-blue-50/30 transition-all cursor-pointer group min-h-[130px] ${count === 0 ? 'col-span-full py-10' : ''}`}
        >
          <div className={`rounded-2xl bg-white border border-slate-200 group-hover:border-[#5391FE]/40 group-hover:bg-blue-50 transition-all flex items-center justify-center ${count === 0 ? 'w-14 h-14' : 'w-10 h-10'}`}>
            <Plus className={`text-slate-300 group-hover:text-[#5391FE] transition-colors ${count === 0 ? 'w-7 h-7' : 'w-5 h-5'}`} />
          </div>
          <div className="text-center">
            <p className={`font-black text-slate-500 group-hover:text-[#012456] transition-colors ${count === 0 ? 'text-sm' : 'text-xs'}`}>
              {count === 0 ? 'Create Your First Group' : 'New Group'}
            </p>
            {count === 0 && (
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                Track shared groceries, project budgets, flat bills, or any collaborative expense pool.
              </p>
            )}
          </div>
          {count === 0 && (
            <span className="px-5 py-2 rounded-xl bg-[#012456] text-white text-xs font-bold group-hover:bg-[#02337a] transition-colors mt-1">
              Get Started
            </span>
          )}
        </button>

      </div>
    </div>
  );
};

export default DashboardTeamSnapshot;
