import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  HandCoins, 
  Bot, 
  Menu
} from 'lucide-react';

interface BottomNavBarProps {
  onOpenMobileMenu: () => void;
  onOpenPWAInstall?: () => void;
}

export const BottomNavBar: React.FC<BottomNavBarProps> = ({ 
  onOpenMobileMenu
}) => {
  const location = useLocation();

  const isCurrent = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Overview', icon: LayoutDashboard, path: '/dashboard' },
    { label: 'Groups', icon: Users, path: '/dashboard/teams' },
    { label: 'Loans', icon: HandCoins, path: '/dashboard/loans' },
    { label: 'AI Copilot', icon: Bot, path: '/dashboard/assistant' },
  ];

  return (
    <nav 
      aria-label="Mobile Bottom Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-lg border-t border-slate-200/90 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2"
    >
      <div className="max-w-md mx-auto px-3 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isCurrent(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
                active 
                  ? 'text-[#5391FE]' 
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                active ? 'bg-blue-50 text-[#5391FE]' : ''
              }`}>
                <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] tracking-tight mt-0.5 ${active ? 'font-black' : 'font-semibold'}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        {/* Menu Drawer Trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          title="More Options"
          className="flex flex-col items-center justify-center py-1 px-2.5 rounded-2xl text-slate-500 hover:text-slate-900 active:scale-90 transition-transform cursor-pointer"
        >
          <div className="w-8 h-8 rounded-xl flex items-center justify-center">
            <Menu className="w-5 h-5 stroke-2" />
          </div>
          <span className="text-[10px] font-semibold tracking-tight mt-0.5">
            More
          </span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavBar;
