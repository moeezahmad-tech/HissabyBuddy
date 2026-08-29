import React, { createContext, useContext, useState } from 'react';

export type CurrencyCode = 'PKR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'SAR' | 'INR' | 'CAD';

export interface CurrencyConfig {
  code: CurrencyCode;
  symbol: string;
  name: string;
  rate: number;
  flag: string;
}

export const CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  PKR: { code: 'PKR', symbol: 'Rs ', name: 'Pakistani Rupee', rate: 1.0, flag: '🇵🇰' },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1.0, flag: '🇺🇸' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', rate: 1.0, flag: '🇪🇺' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', rate: 1.0, flag: '🇬🇧' },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham', rate: 1.0, flag: '🇦🇪' },
  SAR: { code: 'SAR', symbol: 'SAR ', name: 'Saudi Riyal', rate: 1.0, flag: '🇸🇦' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 1.0, flag: '🇮🇳' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', rate: 1.0, flag: '🇨🇦' },
};

interface CurrencyContextType {
  currentCurrency: CurrencyConfig;
  setCurrency: (code: CurrencyCode) => void;
  formatAmount: (amount: number, showSign?: boolean, overrideSymbol?: string) => string;
  convertAmount: (amount: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);
const CURRENCY_STORAGE_KEY = 'hisaaby_currency_code';

export const CurrencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currencyCode, setCurrencyCode] = useState<CurrencyCode>(() => {
    try {
      const saved = localStorage.getItem(CURRENCY_STORAGE_KEY) as CurrencyCode;
      if (saved && CURRENCIES[saved]) {
        return saved;
      }
    } catch {}
    return 'PKR';
  });

  const setCurrency = (code: CurrencyCode) => {
    if (CURRENCIES[code]) {
      setCurrencyCode(code);
      try {
        localStorage.setItem(CURRENCY_STORAGE_KEY, code);
      } catch {}
    }
  };

  const currentCurrency = CURRENCIES[currencyCode] || CURRENCIES.PKR;

  const convertAmount = (amount: number): number => {
    return amount;
  };

  const formatAmount = (amount: number, showSign: boolean = false, overrideSymbol?: string): string => {
    const absVal = Math.abs(amount || 0);
    const sym = overrideSymbol || currentCurrency.symbol;
    const isZeroDecimal = currentCurrency.code === 'PKR' || currentCurrency.code === 'INR';
    const decimals = isZeroDecimal ? 0 : 2;
    const formattedNum = absVal.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });

    let sign = '';
    if (showSign) {
      sign = amount >= 0 ? '+' : '-';
    } else if (amount < 0) {
      sign = '-';
    }

    return `${sign}${sym}${formattedNum}`;
  };

  return (
    <CurrencyContext.Provider
      value={{
        currentCurrency,
        setCurrency,
        formatAmount,
        convertAmount,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

export default CurrencyContext;
