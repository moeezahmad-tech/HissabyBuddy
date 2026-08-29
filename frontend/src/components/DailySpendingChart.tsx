import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, TrendingDown, RefreshCw, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency } from '../context/CurrencyContext';

interface DailyVelocity {
  day: string;
  date: string;
  spend: number;
  income: number;
}

export const DailySpendingChart: React.FC = () => {
  const { user } = useAuth();
  const { formatAmount } = useCurrency();
  const [dailyData, setDailyData] = useState<DailyVelocity[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDailyData = async () => {
    setLoading(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) {
        headers['Authorization'] = `Bearer ${user.token}`;
      }
      const res = await fetch(`${apiUrl}/api/dashboard/spending-trends`, { headers });
      if (res.ok) {
        const data = await res.json();
        setDailyData(data.dailyVelocity || []);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyData();
  }, [user]);

  const maxVal = Math.max(
    ...dailyData.map(d => Math.max(d.spend, d.income)),
    1000
  );

  return (
    <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Activity Tracking
            </span>
          </div>
          <h3 className="text-lg font-black text-[#012456] tracking-tight mt-0.5 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#5391FE]" />
            Day-Wise Income vs Spending Velocity
          </h3>
          <p className="text-xs text-slate-500">
            Daily cashflow distribution and activity trends over the last 7 days.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-emerald-500" />
              <span className="text-slate-600">Income / Salary</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-md bg-rose-500" />
              <span className="text-slate-600">Expenditure</span>
            </div>
          </div>

          <button
            onClick={fetchDailyData}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh Daily Trends"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {dailyData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-2xl">
          <Calendar className="w-8 h-8 text-slate-300 mb-2" />
          <span>No day-wise transactions logged yet.</span>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="h-56 flex items-end justify-between gap-3 sm:gap-6 pt-8 px-2">
            {dailyData.map((d, idx) => {
              const spendHeight = maxVal > 0 ? Math.max((d.spend / maxVal) * 100, 4) : 4;
              const incomeHeight = maxVal > 0 ? Math.max((d.income / maxVal) * 100, 4) : 4;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                  <div className="w-full flex items-end justify-center gap-1.5 h-full relative">
                    
                    {/* Income Bar */}
                    <div
                      style={{ height: d.income > 0 ? `${incomeHeight}%` : '4px' }}
                      className={`w-full max-w-[16px] rounded-t-md transition-all relative ${
                        d.income > 0 ? 'bg-emerald-500 group-hover:bg-emerald-600' : 'bg-slate-100'
                      }`}
                    >
                      {d.income > 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                          +{formatAmount(d.income)}
                        </div>
                      )}
                    </div>

                    {/* Spend Bar */}
                    <div
                      style={{ height: d.spend > 0 ? `${spendHeight}%` : '4px' }}
                      className={`w-full max-w-[16px] rounded-t-md transition-all relative ${
                        d.spend > 0 ? 'bg-rose-500 group-hover:bg-rose-600' : 'bg-slate-100'
                      }`}
                    >
                      {d.spend > 0 && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-1.5 rounded pointer-events-none whitespace-nowrap z-20 shadow-md">
                          -{formatAmount(d.spend)}
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Day Label */}
                  <div className="text-center">
                    <span className="block text-xs font-bold text-slate-700 group-hover:text-[#5391FE] transition-colors">
                      {d.day}
                    </span>
                    <span className="block text-[10px] text-slate-400">
                      {d.date}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
              Total Inflow: <strong>{formatAmount(dailyData.reduce((acc, curr) => acc + curr.income, 0))}</strong>
            </span>
            <span className="flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
              Total Outflow: <strong>{formatAmount(dailyData.reduce((acc, curr) => acc + curr.spend, 0))}</strong>
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailySpendingChart;
