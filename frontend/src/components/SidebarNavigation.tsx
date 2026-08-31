import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Repeat, 
  UploadCloud, 
  Settings, 

  ArrowLeft, 
  ShieldCheck, 
  LogOut,
  Users,
  ChevronLeft,
  ChevronRight,
  X,
  HandCoins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeView?: string;
  setActiveView?: (view: string) => void;
  onBackToLanding?: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
}

export const SidebarNavigation: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  onBackToLanding,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen,
  onCloseMobile
}) => {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
    { id: 'teams', label: 'Teams & Groups', icon: Users, badge: 'Collab', path: '/dashboard/teams' },
    { id: 'loans', label: 'Loans & Debts', icon: HandCoins, badge: 'Udhaar', path: '/dashboard/loans' },
    { id: 'recurring', label: 'Recurring Money', icon: Repeat, badge: 'Bills', path: '/dashboard/recurring' },
    { id: 'assistant', label: 'AI Copilot', icon: Bot, badge: 'Smart', path: '/dashboard/assistant' },
    { id: 'upload', label: 'Document Upload', icon: UploadCloud, badge: 'OCR', path: '/dashboard/upload' },
    { id: 'settings', label: 'Account & Security', icon: Settings, path: '/dashboard/settings' },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (activeView) {
      return activeView === item.id;
    }
    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/dashboard/';
    }
    return location.pathname === item.path || location.pathname.startsWith(`${item.path}/`);
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Main Sidebar Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200 flex flex-col justify-between transition-all duration-300 ease-in-out ${
          // Mobile classes: slide in/out drawer
          isMobileOpen ? 'translate-x-0 w-72 p-5' : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop classes: w-20 when collapsed, w-64 when expanded
          isCollapsed ? 'lg:w-20 lg:p-3' : 'lg:w-64 lg:p-5'
        }`}
      >
        <div>
          {/* Header / Brand + Toggle Controls */}
          <div className={`flex items-center justify-between pb-4 border-b border-slate-200 ${isCollapsed ? 'lg:flex-col lg:gap-3' : ''}`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0">
                <img 
                  src="/logo.png" 
                  alt="Hissaby Buddy Logo" 
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="text-[#5391FE] font-black text-lg">HB</span>';
                    }
                  }}
                />
              </div>

              {/* Title: Hidden when desktop collapsed */}
              <div className={isCollapsed ? 'lg:hidden' : 'block'}>
                <h1 className="text-base font-black text-[#012456] tracking-tight leading-none flex items-center gap-1">
                  Hissaby <span className="text-[#5391FE]">Buddy</span>
                </h1>
                <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5">
                  AI Financial Copilot
                </p>
              </div>
            </div>

            {/* Desktop Collapse / Expand Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-xl border border-slate-200 text-slate-400 hover:text-[#012456] hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              title="Close Menu"
              className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Back to Home & Features */}
          {onBackToLanding && (
            <button
              onClick={() => {
                onBackToLanding();
                onCloseMobile();
              }}
              title="Back to Home & Features"
              className={`mt-3 w-full flex items-center rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer group ${
                isCollapsed ? 'lg:justify-center lg:py-2.5' : 'gap-2 px-3 py-2'
              }`}
            >
              <ArrowLeft className="w-4 h-4 shrink-0 group-hover:-translate-x-0.5 transition-transform" />
              <span className={isCollapsed ? 'lg:hidden' : 'block truncate'}>Home &amp; Features</span>
            </button>
          )}

          {/* Navigation Items */}
          <nav className="mt-4 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = isItemActive(item);

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => {
                    if (setActiveView) setActiveView(item.id);
                    onCloseMobile();
                  }}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full relative flex items-center rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer group ${
                    isCollapsed 
                      ? 'lg:justify-center lg:py-3 lg:px-0' 
                      : 'justify-between px-3.5 py-3'
                  } ${
                    isActive
                      ? 'bg-[#5391FE]/10 text-[#5391FE]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className={`flex items-center gap-3 min-w-0 ${isCollapsed ? 'lg:justify-center' : ''}`}>
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-[#5391FE]' : 'text-slate-500 group-hover:text-slate-900'}`} />
                    <span className={`whitespace-nowrap truncate ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                      {item.label}
                    </span>
                  </div>

                  {/* Badges: hidden when collapsed on desktop */}
                  {item.badge && (
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ml-1.5 ${
                      isCollapsed ? 'lg:hidden' : 'block'
                    } ${
                      isActive ? 'bg-[#5391FE] text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {item.badge}
                    </span>
                  )}

                  {/* Active Indicator Bar */}
                  {isActive && (
                    <div className="absolute left-0 w-1 h-6 bg-[#5391FE] rounded-r-full" />
                  )}

                  {/* Floating Tooltip when Collapsed on Desktop */}
                  {isCollapsed && (
                    <div className="hidden lg:block absolute left-full ml-3 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-lg z-50">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Area: User Auth Profile */}
        <div className="pt-3 border-t border-slate-200/80 space-y-2">


          {/* User Profile Card */}
          {user ? (
            <div className={`flex items-center rounded-2xl bg-white border border-slate-200 shadow-2xs transition-all ${
              isCollapsed ? 'lg:flex-col lg:p-2 lg:gap-2' : 'justify-between p-2'
            }`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-[#012456] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0 select-none">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
                
                <div className={`min-w-0 text-left ${isCollapsed ? 'lg:hidden' : 'block'}`}>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                    <span className="truncate">{user.displayName || user.email}</span>
                    <ShieldCheck className="w-3 h-3 text-[#5391FE] shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 font-semibold block truncate max-w-[120px]">
                    {user.email || 'Active'}
                  </span>
                </div>
              </div>

              <button 
                title="Sign Out"
                aria-label="Sign Out"
                onClick={signOut}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className={`w-full py-2.5 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer ${
                isCollapsed ? 'lg:p-2' : 'px-3'
              }`}
            >
              <span className={isCollapsed ? 'lg:hidden' : 'block'}>Sign In</span>
            </Link>
          )}
        </div>
      </aside>
    </>
  );
};

export default SidebarNavigation;
