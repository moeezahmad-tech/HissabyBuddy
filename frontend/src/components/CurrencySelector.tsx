import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useCurrency, CURRENCIES, type CurrencyCode } from '../context/CurrencyContext';

export const CurrencySelector: React.FC = () => {
  const { currentCurrency, setCurrency } = useCurrency();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer shadow-2xs"
        title="Switch Currency"
      >
        <span className="text-sm">{currentCurrency.flag}</span>
        <span className="font-extrabold">{currentCurrency.code}</span>
        <span className="text-slate-400 font-semibold">({currentCurrency.symbol.trim()})</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 p-1.5 animate-fadeIn">
          <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
            Select Currency
          </div>
          <div className="max-h-60 overflow-y-auto space-y-0.5 py-1">
            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => {
              const curr = CURRENCIES[code];
              const isSelected = currentCurrency.code === code;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setCurrency(code);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors cursor-pointer ${
                    isSelected 
                      ? 'bg-blue-50 text-[#5391FE] font-bold' 
                      : 'text-slate-700 hover:bg-slate-50 font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{curr.flag}</span>
                    <div className="text-left">
                      <span className="font-bold">{curr.code}</span>
                      <span className="text-[10px] text-slate-400 ml-1.5">({curr.symbol.trim()})</span>
                    </div>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#5391FE]" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
