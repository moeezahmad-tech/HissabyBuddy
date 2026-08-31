import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import SidebarNavigation from './SidebarNavigation';
import Header from './Header';

interface AppViewProps {
  onBackToLanding?: () => void;
}

export const AppView: React.FC<AppViewProps> = ({ onBackToLanding }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('hissaby_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem('hissaby_sidebar_collapsed', String(next));
      } catch {}
      return next;
    });
  };

  // Close mobile sidebar on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getActiveView = () => {
    const path = location.pathname.toLowerCase();
    if (path.includes('/teams')) return 'teams';
    if (path.includes('/loans') || path.includes('/loan')) return 'loans';
    if (path.includes('/recurring')) return 'recurring';
    if (path.includes('/assistant')) return 'assistant';
    if (path.includes('/upload')) return 'upload';
    if (path.includes('/settings')) return 'settings';
    return 'dashboard';
  };

  const activeView = getActiveView();

  const getHeaderInfo = () => {
    switch (activeView) {
      case 'dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Real-time cashflow & insights'
        };
      case 'teams':
        return {
          title: 'Shared Groups',
          subtitle: 'Shared bills & grocery splitting'
        };
      case 'loans':
        return {
          title: 'Loans & Debts',
          subtitle: 'Track money lent and borrowed (Udhaar)'
        };
      case 'recurring':
        return {
          title: 'Recurring Money',
          subtitle: 'Bills, rent & fixed commitments'
        };
      case 'assistant':
        return {
          title: 'AI Assistant',
          subtitle: 'Ask questions about your finances'
        };
      case 'upload':
        return {
          title: 'Document Upload',
          subtitle: 'Scan statements, receipts & invoices'
        };
      case 'settings':
        return {
          title: 'Account Settings',
          subtitle: 'Security & preferences'
        };
      default:
        return {
          title: 'Dashboard',
          subtitle: 'Real-time cashflow & insights'
        };
    }
  };

  const { title, subtitle } = getHeaderInfo();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* 1. Collapsible & Responsive Sidebar */}
      <SidebarNavigation 
        activeView={activeView} 
        onBackToLanding={onBackToLanding || (() => navigate('/'))}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={toggleSidebarCollapse}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* 2. Top Header with responsive margin & mobile hamburger toggle */}
      <Header 
        title={title} 
        subtitle={subtitle}
        isSidebarCollapsed={isSidebarCollapsed}
        onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
      />

      {/* 3. Main Routed View Area with dynamic margin */}
      <main 
        className={`pt-24 sm:pt-28 px-4 sm:px-8 lg:px-10 pb-16 transition-all duration-300 ${
          isSidebarCollapsed 
            ? 'lg:ml-20 lg:w-[calc(100%-5rem)]' 
            : 'lg:ml-64 lg:w-[calc(100%-16rem)]'
        } ml-0 w-full max-w-full`}
      >
        <Outlet />
      </main>
    </div>
  );
};

export default AppView;
