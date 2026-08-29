import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Sparkles, Receipt, Coins } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type?: 'transaction' | 'system' | 'currency';
}

export const NotificationPopover: React.FC = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch(`${apiUrl}/api/dashboard/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 20000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  return (
    <div className="relative" ref={popoverRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notifications"
        className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#5391FE] text-slate-500 hover:text-[#5391FE] flex items-center justify-center transition-colors relative cursor-pointer"
        title="View Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center border-2 border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-4 animate-fadeIn">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#012456] text-xs">Financial Activity Alerts</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-[#5391FE] hover:text-[#437de0] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Mark read</span>
              </button>
            )}
          </div>

          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto my-1 py-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`py-3 px-2 flex items-start gap-3 rounded-2xl transition-colors ${
                    n.unread ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    n.type === 'transaction' 
                      ? 'bg-emerald-50 text-emerald-600'
                      : n.type === 'currency'
                      ? 'bg-amber-50 text-amber-600'
                      : 'bg-blue-50 text-[#5391FE]'
                  }`}>
                    {n.type === 'transaction' ? (
                      <Receipt className="w-4 h-4" />
                    ) : n.type === 'currency' ? (
                      <Coins className="w-4 h-4" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 leading-tight">
                      {n.title}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[9px] text-slate-400 mt-1 block">
                      {n.time}
                    </span>
                  </div>

                  {n.unread && (
                    <span className="w-2 h-2 rounded-full bg-[#5391FE] shrink-0 mt-1.5" />
                  )}
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400">Hisaaby Financial Vector Engine • Real-Time</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;
