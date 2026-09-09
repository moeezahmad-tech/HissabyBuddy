import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Bot, 
  Repeat, 
  UploadCloud, 
  Settings, 
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

  // State for flyout card in collapsed mode
  const [showProfileCard, setShowProfileCard] = useState(false);
  const profileContainerRef = useRef<HTMLDivElement>(null);

  // Close profile popup when clicking outside or resizing
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileContainerRef.current && !profileContainerRef.current.contains(e.target as Node)) {
        setShowProfileCard(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isCollapsed) {
      setShowProfileCard(false);
    }
  }, [isCollapsed]);

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

  const handleBrandClick = () => {
    if (onBackToLanding) {
      onBackToLanding();
    }
    onCloseMobile();
  };

  return (
    <>
      {/* 1. Mobile Backdrop Overlay with smooth blur and fade */}
      {isMobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 lg:hidden transition-opacity duration-300 animate-fadeIn"
          aria-hidden="true"
        />
      )}

      {/* 2. Main Sidebar Drawer / Container */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 ease-out shadow-xs ${
          // Mobile classes: smooth slide-in drawer with rounded right corner and modern shadow
          isMobileOpen 
            ? 'translate-x-0 w-72 sm:w-80 p-5 rounded-r-3xl shadow-2xl shadow-slate-950/20' 
            : '-translate-x-full lg:translate-x-0'
        } ${
          // Desktop classes: w-20 when collapsed, w-64 when expanded
          isCollapsed ? 'lg:w-20 lg:p-3' : 'lg:w-64 lg:p-5'
        }`}
      >
        <div className="flex-1 flex flex-col min-h-0 overflow-y-auto no-scrollbar">
          {/* Header: Brand Logo & Website Name -> Click goes to Home & Landing */}
          <div className={`flex items-center justify-between pb-4 border-b border-slate-200/80 shrink-0 ${isCollapsed ? 'lg:flex-col lg:gap-3' : ''}`}>
            <button
              type="button"
              onClick={handleBrandClick}
              title="Click website name to return to Home"
              className="flex items-center gap-3 min-w-0 text-left group cursor-pointer focus:outline-none"
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 overflow-hidden shrink-0 group-hover:border-[#5391FE] group-hover:scale-105 transition-all">
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

              {/* Title & Subtitle: Hidden only when desktop sidebar is collapsed */}
              <div className={isCollapsed ? 'lg:hidden' : 'block'}>
                <h1 className="text-base font-black text-[#012456] tracking-tight leading-none flex items-center gap-1 group-hover:text-[#5391FE] transition-colors">
                  Hissaby <span className="text-[#5391FE]">Buddy</span>
                </h1>
                <p className="text-[9px] font-bold tracking-wider text-slate-400 uppercase mt-0.5 group-hover:text-slate-600 transition-colors">
                  AI Financial Copilot
                </p>
              </div>
            </button>

            {/* Desktop Collapse / Expand Toggle Button */}
            <button
              type="button"
              onClick={onToggleCollapse}
              title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
              className="hidden lg:flex items-center justify-center w-7 h-7 rounded-xl border border-slate-200 text-slate-400 hover:text-[#012456] hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shrink-0"
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>

            {/* Mobile Close Drawer Button */}
            <button
              type="button"
              onClick={onCloseMobile}
              title="Close Menu"
              className="lg:hidden w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors flex items-center justify-center cursor-pointer active:scale-95"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Items List */}
          <nav className="mt-4 space-y-1.5 flex-1">
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
                  className={`w-full relative flex items-center rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer group min-h-[44px] ${
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

        {/* 3. Bottom Area: User Auth Profile Card */}
        <div className="pt-3 border-t border-slate-200/80 space-y-2 shrink-0">
          {/* User Profile Area */}
          {user ? (
            <>
              {/* Collapsed Mode on Desktop (hidden on mobile drawer & expanded desktop) */}
              <div 
                ref={profileContainerRef}
                className={`relative ${isCollapsed ? 'hidden lg:flex justify-center w-full' : 'hidden'}`}
                onMouseEnter={() => setShowProfileCard(true)}
                onMouseLeave={() => setShowProfileCard(false)}
              >
                {/* ONLY Display DP (Profile Picture / Avatar Circle) in Collapsed Sidebar */}
                <button
                  type="button"
                  onClick={() => setShowProfileCard(prev => !prev)}
                  title={user.displayName || user.email}
                  className="w-10 h-10 rounded-2xl bg-[#012456] hover:bg-[#023173] text-white font-black text-xs flex items-center justify-center shadow-xs ring-2 ring-transparent hover:ring-[#5391FE]/40 transition-all cursor-pointer select-none"
                >
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </button>

                {/* Floating Profile Card on Hover or Click */}
                {showProfileCard && (
                  <div 
                    className="absolute left-full bottom-0 ml-3 w-64 p-4 rounded-3xl bg-white border border-slate-200/90 shadow-2xl z-50 animate-fadeIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                      <div className="w-11 h-11 rounded-2xl bg-[#012456] text-white font-black flex items-center justify-center text-sm shadow-xs shrink-0 select-none">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-black text-[#012456] flex items-center gap-1 truncate">
                          <span className="truncate">{user.displayName || user.email}</span>
                          <ShieldCheck className="w-3.5 h-3.5 text-[#5391FE] shrink-0" />
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium block truncate">
                          {user.email || 'Active Account'}
                        </span>
                        <span className="inline-block mt-0.5 text-[9px] uppercase font-bold tracking-wider text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Verified User
                        </span>
                      </div>
                    </div>

                    <div className="pt-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileCard(false);
                          signOut();
                        }}
                        className="w-full py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Expanded Mode (Desktop Expanded & Mobile Drawer) */}
              <div className={`p-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 shadow-2xs transition-all flex items-center justify-between gap-2 ${
                isCollapsed ? 'lg:hidden' : 'flex'
              }`}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#012456] text-white font-black flex items-center justify-center text-xs shadow-xs shrink-0 select-none">
                    {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="min-w-0 text-left">
                    <div className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                      <span className="truncate">{user.displayName || user.email}</span>
                      <ShieldCheck className="w-3 h-3 text-[#5391FE] shrink-0" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium block truncate max-w-[125px]">
                      {user.email || 'Active'}
                    </span>
                  </div>
                </div>

                <button 
                  type="button"
                  title="Sign Out"
                  aria-label="Sign Out"
                  onClick={signOut}
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </>
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
