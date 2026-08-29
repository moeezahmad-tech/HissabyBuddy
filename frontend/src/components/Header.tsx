import { Search, Sparkles } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import NotificationPopover from './NotificationPopover';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Financial Executive Dashboard',
  subtitle = 'Real-time multi-account analytics & AI vector copilot'
}) => {
  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 left-72 z-30 px-8 flex items-center justify-between">
      {/* Title & Context */}
      <div>
        <h2 className="text-xl font-black text-[#012456] tracking-tight">
          {title}
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          {subtitle}
        </p>
      </div>

      {/* Search & Actions */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions, accounts, or uploaded statements..."
            className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-black placeholder-slate-400 focus:outline-none focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all w-72"
          />
        </div>

        {/* Currency Switcher */}
        <CurrencySelector />

        <div className="hidden lg:flex items-center gap-1.5 text-xs text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
          <span>Smart AI Assistant Active</span>
        </div>

        {/* Interactive Notification Center */}
        <NotificationPopover />
      </div>
    </header>
  );
};

export default Header;
