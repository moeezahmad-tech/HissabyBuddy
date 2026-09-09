import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Menu, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getStoredReadIds, 
  getStoredDismissedIds, 
  getCachedNotifications,
  saveCachedNotifications,
  type NotificationItem 
} from './NotificationsView';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const calculateUnreadFromCache = () => {
    const cached = getCachedNotifications();
    const readIds = getStoredReadIds();
    const dismissedIds = getStoredDismissedIds();
    return cached.filter(
      (n) => !dismissedIds.has(n.id) && (readIds.has(n.id) ? false : n.unread)
    ).length;
  };

  // Instant zero-delay unread badge initialized from local cache
  const [unreadCount, setUnreadCount] = useState<number>(calculateUnreadFromCache);

  const isNotificationsPage = location.pathname.includes('/notifications');

  useEffect(() => {
    const updateFromCache = () => {
      setUnreadCount(calculateUnreadFromCache());
    };

    const checkUnread = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const headers: Record<string, string> = {};
        if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

        const res = await fetch(`${apiUrl}/api/dashboard/notifications`, { headers });
        if (res.ok) {
          const data = await res.json();
          const raw: NotificationItem[] = data.notifications || [];
          saveCachedNotifications(raw);
          const readIds = getStoredReadIds();
          const dismissedIds = getStoredDismissedIds();
          const unread = raw.filter(
            (n) => !dismissedIds.has(n.id) && (readIds.has(n.id) ? false : n.unread)
          ).length;
          setUnreadCount(unread);
        }
      } catch {}
    };

    updateFromCache();
    checkUnread();
    window.addEventListener('hissaby_notifications_updated', updateFromCache);
    const interval = setInterval(checkUnread, 15000);
    return () => {
      window.removeEventListener('hissaby_notifications_updated', updateFromCache);
      clearInterval(interval);
    };
  }, [user, location.pathname]);

  return (
    <header 
      className={`h-16 sm:h-20 bg-white/95 backdrop-blur-md border-b border-slate-200 fixed top-0 right-0 z-30 px-3.5 sm:px-8 flex items-center justify-between transition-all duration-300 left-0 ${
        isSidebarCollapsed ? 'lg:left-20' : 'lg:left-64'
      }`}
    >
      {/* Left: Mobile Menu Toggle + Title */}
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          title="Open Menu"
          className="lg:hidden p-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-[#012456] hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer shrink-0 shadow-2xs active:scale-90"
        >
          <Menu className="w-5 h-5 stroke-[2.2px]" />
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

      {/* Right: Search & Notifications */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <div className="relative hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions..."
            className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all w-40 lg:w-64"
          />
        </div>

        {/* Dedicated Notifications Page Link Button with Live Unread Badge */}
        <button
          type="button"
          onClick={() => navigate('/dashboard/notifications')}
          aria-label="Notifications"
          title="View All Notifications"
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-all relative cursor-pointer active:scale-95 shadow-2xs ${
            isNotificationsPage
              ? 'bg-blue-50 border-[#5391FE] text-[#5391FE]'
              : 'bg-slate-50 border-slate-200 hover:border-[#5391FE] text-slate-600 hover:text-[#5391FE]'
          }`}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white animate-pulse shadow-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default Header;
