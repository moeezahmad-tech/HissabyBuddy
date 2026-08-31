import React from 'react';
import { Search, Menu } from 'lucide-react';
import CurrencySelector from './CurrencySelector';
import NotificationPopover from './NotificationPopover';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  isSidebarCollapsed?: boolean;
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title = 'Dashboard',
  subtitle = 'Cashflow analytics & AI copilot',
  isSidebarCollapsed = false,
  onOpenMobileMenu
}) => {
  return (
    <header 
      className={`h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 z-30 px-4 sm:px-8 flex items-center justify-between transition-all duration-300 left-0 ${
        isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      {/* Left: Mobile Menu Toggle + Title */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          title="Open Menu"
          className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-base sm:text-lg lg:text-xl font-black text-[#012456] tracking-tight truncate">
            {title}
          </h2>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Right: Search & Actions */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all w-44 lg:w-64"
          />
        </div>

        {/* Currency Switcher */}
        <CurrencySelector />



        {/* Interactive Notification Center */}
        <NotificationPopover />
      </div>
    </header>
  );
};

export default Header;
