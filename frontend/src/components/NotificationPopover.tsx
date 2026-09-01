import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Sparkles, Receipt, Coins, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type?: 'transaction' | 'system' | 'currency' | 'invite';
  token?: string;
}

const READ_STORAGE_KEY = 'hissaby_read_notifications_v1';

function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

function saveStoredReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export const NotificationPopover: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [joiningToken, setJoiningToken] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const headers: Record<string, string> = {};
      if (user?.token) headers['Authorization'] = `Bearer ${user.token}`;

      const res = await fetch(`${apiUrl}/api/dashboard/notifications`, { headers });
      if (res.ok) {
        const data = await res.json();
        const rawNotifs: NotificationItem[] = data.notifications || [];
        const readIds = getStoredReadIds();

        const syncedNotifs = rawNotifs.map((n) => ({
          ...n,
          unread: readIds.has(n.id) ? false : n.unread,
        }));

        setNotifications(syncedNotifs);
        setUnreadCount(syncedNotifs.filter((n) => n.unread).length);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 6000);
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

  const markSingleAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const readIds = getStoredReadIds();
    readIds.add(id);
    saveStoredReadIds(readIds);

    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, unread: false } : n))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));
  };

  const markAllAsRead = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const readIds = getStoredReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveStoredReadIds(readIds);

    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
  };

  const acceptInvite = async (token: string, notifId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (joiningToken) return;
    setJoiningToken(token);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/workspaces/invitations/${token}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(user?.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
      });
      const data = await response.json();
      if (data.status === 'success') {
        localStorage.removeItem('hissaby_cached_workspaces');
        markSingleAsRead(notifId);
        setIsOpen(false);
        toast.success('Successfully joined the group!');
        window.location.href = '/dashboard/teams';
      } else {
        toast.error(data.detail || data.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation.');
    } finally {
      setJoiningToken(null);
    }
  };

  return (
    <div className="relative font-sans" ref={popoverRef}>
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
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
        <div className="absolute right-0 mt-2 w-84 sm:w-96 bg-white border border-slate-200 rounded-3xl shadow-2xl z-50 p-4 animate-fadeIn">
          {/* Header Bar */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#012456] text-xs">Financial Alerts</span>
              {unreadCount > 0 ? (
                <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold">
                  All caught up
                </span>
              )}
            </div>

            {/* Mark All As Read Button */}
            <button
              type="button"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
              className={`text-xs font-bold flex items-center gap-1.5 px-2.5 py-1 rounded-xl transition-all ${
                unreadCount > 0
                  ? 'text-[#5391FE] hover:text-[#437de0] hover:bg-blue-50 cursor-pointer shadow-2xs'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
              title="Mark all notifications as read"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all as read</span>
            </button>
          </div>

          {/* Notifications List */}
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto my-1 py-1 space-y-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No notifications right now.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`py-3 px-3 rounded-2xl transition-all flex flex-col gap-1.5 ${
                    n.unread ? 'bg-blue-50/40 border border-blue-100/80 shadow-2xs' : 'hover:bg-slate-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.type === 'transaction' 
                        ? 'bg-emerald-50 text-emerald-600'
                        : n.type === 'currency'
                        ? 'bg-amber-50 text-amber-600'
                        : n.type === 'invite'
                        ? 'bg-purple-50 text-purple-600'
                        : 'bg-blue-50 text-[#5391FE]'
                    }`}>
                      {n.type === 'transaction' ? (
                        <Receipt className="w-4 h-4" />
                      ) : n.type === 'currency' ? (
                        <Coins className="w-4 h-4" />
                      ) : n.type === 'invite' ? (
                        <UserPlus className="w-4 h-4" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-bold text-slate-800 leading-tight truncate">
                          {n.title}
                        </p>
                        {n.unread && (
                          <span className="w-2 h-2 rounded-full bg-[#5391FE] shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">
                        {n.message}
                      </p>

                      {/* Time & Mark as read action button */}
                      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-100/70">
                        <span className="text-[9px] text-slate-400 font-medium">
                          {n.time}
                        </span>

                        {n.unread ? (
                          <div className="flex items-center gap-1.5">
                            {n.type === 'invite' && n.token && (
                              <button
                                type="button"
                                disabled={Boolean(joiningToken)}
                                onClick={(e) => acceptInvite(n.token!, n.id, e)}
                                className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all shadow-2xs ${
                                  joiningToken === n.token
                                    ? 'bg-purple-400 cursor-wait'
                                    : 'bg-purple-600 hover:bg-purple-700 cursor-pointer'
                                }`}
                                title="Accept invitation and join group"
                              >
                                {joiningToken === n.token ? (
                                  <>
                                    <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Joining...</span>
                                  </>
                                ) : (
                                  <span>Join Group</span>
                                )}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => markSingleAsRead(n.id, e)}
                              className="text-[10px] font-bold text-[#5391FE] hover:text-[#437de0] bg-white hover:bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                              title="Mark this notification as read"
                            >
                              <Check className="w-3 h-3" />
                              <span>{n.type === 'invite' ? 'Ignore' : 'Mark as read'}</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1">
                            <CheckCheck className="w-3 h-3 text-emerald-500" />
                            <span>{n.type === 'invite' ? 'Accepted / Ignored' : 'Read'}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-slate-100 text-center">
            <span className="text-[10px] text-slate-400">Hissaby Financial Alerts • Live</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPopover;
