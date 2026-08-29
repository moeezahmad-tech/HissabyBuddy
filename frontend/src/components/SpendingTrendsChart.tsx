import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar, PieChart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface CategoryTrend {
  category: string;
  amount: number;
  budget: number;
}

interface MonthVelocity {
  month: string;
  spend: number;
  budget: number;
}

export const SpendingTrendsChart: React.FC = () => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [categories, setCategories] = useState<CategoryTrend[]>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_categories');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [monthlyVelocity, setMonthlyVelocity] = useState<MonthVelocity[]>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_velocity');
      if (cached) return JSON.parse(cached);
    } catch {}
    return [];
  });
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    const fetchTrends = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        const res = await fetch(`${apiUrl}/api/dashboard/spending-trends`, { headers });
        if (res.ok) {
          const data = await res.json();
          const cats = data.categories || [];
          const vel = data.monthlyVelocity || [];
          localStorage.setItem('hissaby_cached_categories', JSON.stringify(cats));
          localStorage.setItem('hissaby_cached_velocity', JSON.stringify(vel));
          setCategories(cats);
          setMonthlyVelocity(vel);
        }
      } catch {
        setCategories([]);
        setMonthlyVelocity([]);
      }
    };

    fetchTrends();
  }, [user]);

  const maxVal = monthlyVelocity.length > 0
    ? Math.max(...monthlyVelocity.map(m => Math.max(m.spend, m.budget))) * 1.15
    : 1000;

  return (
    <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-xs transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 text-[#5391FE] text-xs font-bold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Financial Analytics</span>
          </div>
          <h3 className="text-xl font-black text-[#012456] tracking-tight">
            Spending Trends &amp; Velocity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time multi-account category expenditure over time
          </p>
        </div>

        {monthlyVelocity.length > 0 && (
          <div className="flex items-center gap-2">
            {['All', ...(categories.map(c => c.category))].slice(0, 4).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeCategory === cat
                    ? 'bg-[#012456] text-white shadow-xs'
                    : 'bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </div>

      {monthlyVelocity.length === 0 ? (
        <div className="py-16 text-center flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center mb-3">
            <PieChart className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-[#012456]">No Trend Records Yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mt-1">
            {user
              ? 'Connect bank statements or start logging transactions to see your monthly spending curve and category breakdowns.'
              : 'Sign in with Google to visualize your personal financial trends.'}
          </p>
        </div>
      ) : (
        <>
          {/* Bar Chart Visualization */}
          <div className="h-64 flex items-end justify-between gap-2 sm:gap-6 pt-6 border-b border-slate-200 pb-2">
            {monthlyVelocity.map((item) => {
              const spendHeight = (item.spend / maxVal) * 100;
              const budgetHeight = (item.budget / maxVal) * 100;

              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full">
                    {/* Spend Bar */}
                    <div
                      style={{ height: `${spendHeight}%` }}
                      className="w-full max-w-[20px] rounded-t-lg bg-[#5391FE] group-hover:bg-[#437de0] transition-all relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-10">
                        {formatAmount(item.spend)}
                      </div>
                    </div>

                    {/* Budget Reference Bar */}
                    <div
                      style={{ height: `${budgetHeight}%` }}
                      className="w-full max-w-[12px] rounded-t-lg bg-slate-200 group-hover:bg-slate-300 transition-all"
                      title={`Budget: ${formatAmount(item.budget)}`}
                    />
                  </div>

                  <span className="text-xs font-bold text-slate-500 group-hover:text-[#012456] transition-colors">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Chart Legend */}
          <div className="flex items-center justify-between pt-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-[#5391FE]" />
                <span>Actual Expenditure</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-slate-200" />
                <span>Allocated Budget Cap</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>FY 2026 Fiscal Cycle</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default SpendingTrendsChart;
