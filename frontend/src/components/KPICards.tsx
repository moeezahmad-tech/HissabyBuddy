import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, PiggyBank } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';

interface MetricsData {
  totalBalance: number;
  balanceChange: string;
  monthlySpend: number;
  spendChange: string;
  isPositive: boolean;
  totalIncome?: number;
  netSavings?: number;
  savingsRate?: string;
  recurringCommitments?: number;
  aiSavingsIdentified?: number;
  accountsCount: number;
  currency?: string;
  currencySymbol?: string;
}

export const KPICards: React.FC = () => {
  const { user } = useAuth();
  const { currentCurrency, setCurrency } = useCurrency();

  const [metrics, setMetrics] = useState<MetricsData>(() => {
    try {
      const cached = localStorage.getItem('hissaby_cached_metrics');
      if (cached) return JSON.parse(cached);
    } catch {}
    return {
      totalBalance: 0,
      balanceChange: '0.0%',
      monthlySpend: 0,
      spendChange: '0.0%',
      isPositive: true,
      aiSavingsIdentified: 0,
      accountsCount: 0
    };
  });
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    const fetchMetrics = async () => {
      setHasError(false);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        const res = await fetch(`${apiUrl}/api/dashboard/metrics`, { headers });
        if (res.ok && !isCancelled) {
          const data = await res.json();
          if (data.currency && CURRENCIES[data.currency as CurrencyCode]) {
            setCurrency(data.currency as CurrencyCode);
          }

          const metricsPayload: MetricsData = {
            totalBalance: data.totalBalance || 0,
            balanceChange: data.balanceChange || '+0.0%',
            monthlySpend: data.monthlySpend || 0,
            spendChange: data.spendChange || '0.0%',
            isPositive: !data.isUnderBudget,
            totalIncome: data.totalIncome || 0,
            netSavings: data.netSavings || 0,
            savingsRate: data.savingsRate || '0%',
            recurringCommitments: data.recurringCommitments || 0,
            aiSavingsIdentified: data.aiSavingsIdentified || 0,
            accountsCount: data.activeAccountsCount || 0,
            currency: data.currency,
            currencySymbol: data.currencySymbol
          };
          localStorage.setItem('hissaby_cached_metrics', JSON.stringify(metricsPayload));
          setMetrics(metricsPayload);
        } else if (!res.ok && !isCancelled) {
          setHasError(true);
        }
      } catch {
        if (!isCancelled) {
          setHasError(true);
        }
      }
    };

    fetchMetrics();

    return () => {
      isCancelled = true;
    };
  }, [user]);

  const displaySymbol = currentCurrency.symbol || metrics.currencySymbol || 'Rs ';

  const formatCardValue = (val: number) => {
    return `${displaySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const kpis = [
    {
      title: 'Total Balance',
      value: formatCardValue(metrics.totalBalance),
      change: metrics.balanceChange,
      isPositive: true,
      subtitle: `${metrics.accountsCount || 1} active account connected`,
      icon: Wallet,
    },
    {
      title: 'Monthly Spend',
      value: formatCardValue(metrics.monthlySpend),
      change: metrics.spendChange,
      isPositive: false,
      subtitle: 'Current monthly expenditure',
      icon: TrendingUp,
    },
    {
      title: 'Net Monthly Savings',
      value: formatCardValue(metrics.netSavings ?? (metrics.totalBalance > metrics.monthlySpend ? metrics.totalBalance - metrics.monthlySpend : 0)),
      change: metrics.savingsRate && metrics.savingsRate !== '0%' ? `${metrics.savingsRate} Saved` : 'Surplus',
      isPositive: (metrics.netSavings ?? 0) >= 0,
      subtitle: (metrics.totalIncome && metrics.totalIncome > 0)
        ? `Inflow: ${displaySymbol}${metrics.totalIncome.toLocaleString()} • Outflow: ${displaySymbol}${metrics.monthlySpend.toLocaleString()}`
        : 'Net liquid surplus after monthly expenses',
      icon: PiggyBank,
      highlight: true,
    },
  ];

  return (
    <div className="space-y-4">
      {hasError && (
        <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Unable to sync with live backend. Showing cached metrics.</span>
          </div>
          <button 
            onClick={() => setHasError(false)}
            className="text-amber-700 hover:text-amber-900 font-bold ml-2 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              className={`p-6 rounded-3xl bg-white border transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${
                kpi.highlight
                  ? 'border-[#5391FE]/50 bg-gradient-to-br from-white to-blue-50/20'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-[#5391FE] flex items-center justify-center group-hover:scale-105 group-hover:border-[#5391FE]/30 transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  kpi.highlight
                    ? 'bg-blue-50 text-[#5391FE] border border-blue-200'
                    : kpi.isPositive
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}>
                  {kpi.isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                  {kpi.change}
                </span>
              </div>

              <div className="mt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {kpi.title}
                </h4>
                <div className="text-3xl font-black text-[#012456] tracking-tight mt-1">
                  {kpi.value}
                </div>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  {kpi.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KPICards;
