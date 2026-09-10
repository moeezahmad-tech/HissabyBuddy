import React, { useEffect, useState } from 'react';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownRight, AlertCircle, HandCoins } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCurrency, CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';

import { appStorage, STORAGE_KEYS } from '../services/appStorage';

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

const DEFAULT_METRICS: MetricsData = {
  totalBalance: 0,
  balanceChange: '0.0%',
  monthlySpend: 0,
  spendChange: '0.0%',
  isPositive: true,
  aiSavingsIdentified: 0,
  accountsCount: 0
};

export const KPICards: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentCurrency, setCurrency } = useCurrency();

  // Instant 0ms render from dual-cache
  const [metrics, setMetrics] = useState<MetricsData>(() => {
    const init = appStorage.getInitial<MetricsData>(STORAGE_KEYS.METRICS, DEFAULT_METRICS);
    const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
    if (cachedTxs.length === 0) {
      return {
        ...init,
        totalBalance: 0,
        monthlySpend: 0,
        totalIncome: 0,
        netSavings: 0,
      };
    }
    if (init && init.totalBalance === 50000) {
      init.totalBalance = 0;
    }
    return init;
  });

  const [loans, setLoans] = useState<any[]>(() =>
    appStorage.getInitial<any[]>(STORAGE_KEYS.LOANS, [])
  );
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;

    // Check IndexedDB if localStorage was empty or needs hydration
    appStorage.hydrateFromIndexedDB<MetricsData>(STORAGE_KEYS.METRICS, (dbMetrics) => {
      if (dbMetrics && !isCancelled) {
        const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
        if (cachedTxs.length === 0) {
          setMetrics({
            ...dbMetrics,
            totalBalance: 0,
            monthlySpend: 0,
            totalIncome: 0,
            netSavings: 0,
          });
        } else {
          setMetrics(dbMetrics);
        }
      }
    });

    appStorage.hydrateFromIndexedDB<any[]>(STORAGE_KEYS.LOANS, (dbLoans) => {
      if (dbLoans && Array.isArray(dbLoans) && !isCancelled) {
        setLoans(dbLoans);
      }
    });

    // Real-time synchronization when transaction is logged, deleted, or metrics update
    const unsubscribeMetrics = appStorage.subscribe<MetricsData>(STORAGE_KEYS.METRICS, (newMetrics) => {
      if (newMetrics && !isCancelled) {
        const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
        if (cachedTxs.length === 0) {
          setMetrics({
            ...newMetrics,
            totalBalance: 0,
            monthlySpend: 0,
            totalIncome: 0,
            netSavings: 0,
          });
        } else {
          setMetrics(newMetrics);
        }
      }
    });

    const unsubscribeLoans = appStorage.subscribe<any[]>(STORAGE_KEYS.LOANS, (newLoans) => {
      if (Array.isArray(newLoans) && !isCancelled) {
        setLoans(newLoans);
      }
    });

    const unsubscribeTxs = appStorage.subscribe<any[]>(STORAGE_KEYS.TRANSACTIONS, (txs) => {
      if (!isCancelled && Array.isArray(txs)) {
        if (txs.length === 0) {
          setMetrics((prev) => ({
            ...prev,
            totalBalance: 0,
            monthlySpend: 0,
            totalIncome: 0,
            netSavings: 0,
          }));
          appStorage.save(STORAGE_KEYS.METRICS, {
            totalBalance: 0,
            monthlySpend: 0,
            totalIncome: 0,
            netSavings: 0,
            balanceChange: '+0.0%',
            spendChange: '0.0%',
            isPositive: true,
            accountsCount: 0,
          });
        } else {
          const spend = txs.filter((t: any) => t.amount < 0).reduce((sum: number, t: any) => sum + Math.abs(t.amount), 0);
          const income = txs.filter((t: any) => t.amount > 0).reduce((sum: number, t: any) => sum + t.amount, 0);
          const bal = Math.max(0, income - spend);
          setMetrics((prev) => ({
            ...prev,
            totalBalance: bal,
            monthlySpend: spend,
            totalIncome: income,
            netSavings: income - spend,
          }));
        }
      }
    });

    const fetchMetricsAndLoans = async () => {
      setHasError(false);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (user?.token) {
          headers['Authorization'] = `Bearer ${user.token}`;
        }
        if (user?.uid) {
          headers['X-User-Id'] = user.uid;
        }

        const [metricsRes, loansRes] = await Promise.allSettled([
          fetch(`${apiUrl}/api/dashboard/metrics`, { headers }),
          fetch(`${apiUrl}/api/dashboard/loans`, { headers })
        ]);

        if (metricsRes.status === 'fulfilled' && metricsRes.value.ok && !isCancelled) {
          const data = await metricsRes.value.json();
          if (data.currency && CURRENCIES[data.currency as CurrencyCode]) {
            setCurrency(data.currency as CurrencyCode);
          }

          const cachedTxs = appStorage.getInitial<any[]>(STORAGE_KEYS.TRANSACTIONS, []);
          const isZeroTxs = cachedTxs.length === 0;

          const metricsPayload: MetricsData = {
            totalBalance: isZeroTxs ? 0 : (data.totalBalance || 0),
            balanceChange: isZeroTxs ? '+0.0%' : (data.balanceChange || '+0.0%'),
            monthlySpend: isZeroTxs ? 0 : (data.monthlySpend || 0),
            spendChange: isZeroTxs ? '0.0%' : (data.spendChange || '0.0%'),
            isPositive: !data.isUnderBudget,
            totalIncome: isZeroTxs ? 0 : (data.totalIncome || 0),
            netSavings: isZeroTxs ? 0 : (data.netSavings || 0),
            savingsRate: isZeroTxs ? '0%' : (data.savingsRate || '0%'),
            recurringCommitments: data.recurringCommitments || 0,
            aiSavingsIdentified: data.aiSavingsIdentified || 0,
            accountsCount: isZeroTxs ? 0 : (data.activeAccountsCount || 0),
            currency: data.currency,
            currencySymbol: data.currencySymbol
          };
          appStorage.save(STORAGE_KEYS.METRICS, metricsPayload);
          setMetrics(metricsPayload);
        }

        if (loansRes.status === 'fulfilled' && loansRes.value.ok && !isCancelled) {
          const lData = await loansRes.value.json();
          if (Array.isArray(lData.loans)) {
            setLoans(lData.loans);
            appStorage.save(STORAGE_KEYS.LOANS, lData.loans);
          }
        }
      } catch {
        if (!isCancelled) {
          setHasError(true);
        }
      }
    };

    fetchMetricsAndLoans();

    return () => {
      isCancelled = true;
      unsubscribeMetrics();
      unsubscribeLoans();
      unsubscribeTxs();
    };
  }, [user]);

  const displaySymbol = currentCurrency.symbol || metrics.currencySymbol || 'Rs ';

  const formatCardValue = (val: number) => {
    return `${displaySymbol}${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  // Loans to Pay: money borrowed that still needs to be repaid
  const totalBorrowedRemaining = loans
    .filter((l: any) => l.type === 'borrowed' && l.status !== 'settled')
    .reduce((sum: number, l: any) => sum + Math.max(0, (l.amount || 0) - (l.repaidAmount || 0)), 0);

  const activeBorrowedCount = loans.filter(
    (l: any) => l.type === 'borrowed' && l.status !== 'settled' && ((l.amount || 0) - (l.repaidAmount || 0)) > 0
  ).length;

  const kpis = [
    {
      title: 'Total Balance',
      value: formatCardValue(metrics.totalBalance),
      change: metrics.balanceChange,
      isPositive: true,
      subtitle: '',
      icon: Wallet,
      highlight: false,
      onClick: undefined,
    },
    {
      title: 'Monthly Spend',
      value: formatCardValue(metrics.monthlySpend),
      change: metrics.spendChange,
      isPositive: false,
      subtitle: 'Current monthly expenditure',
      icon: TrendingUp,
      highlight: false,
      onClick: undefined,
    },
    {
      title: 'Loans to Pay',
      value: formatCardValue(totalBorrowedRemaining),
      change: activeBorrowedCount > 0 ? `${activeBorrowedCount} Active` : 'All Settled',
      isPositive: totalBorrowedRemaining === 0,
      subtitle: activeBorrowedCount > 0
        ? `${activeBorrowedCount} pending borrowed ${activeBorrowedCount === 1 ? 'loan' : 'loans'} • Click to view`
        : 'No pending borrowed loans to repay',
      icon: HandCoins,
      highlight: true,
      onClick: () => navigate('/dashboard/loans'),
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-6">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.title}
              onClick={kpi.onClick}
              role={kpi.onClick ? 'button' : undefined}
              tabIndex={kpi.onClick ? 0 : undefined}
              onKeyDown={(e) => {
                if (kpi.onClick && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  kpi.onClick();
                }
              }}
              className={`p-4 sm:p-6 rounded-3xl bg-white border transition-all duration-300 shadow-xs hover:shadow-md hover:-translate-y-0.5 group ${
                kpi.onClick ? 'cursor-pointer' : ''
              } ${
                kpi.highlight
                  ? 'border-[#5391FE]/50 bg-gradient-to-br from-white to-blue-50/20 hover:border-[#5391FE]'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 text-[#5391FE] flex items-center justify-center group-hover:scale-105 group-hover:border-[#5391FE]/30 transition-all">
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                  kpi.title === 'Loans to Pay'
                    ? totalBorrowedRemaining > 0
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : kpi.highlight
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
                {kpi.subtitle ? (
                  <p className="text-xs text-slate-500 font-medium mt-1">
                    {kpi.subtitle}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KPICards;
