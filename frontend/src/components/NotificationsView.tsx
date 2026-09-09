import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Sparkles, 
  Receipt, 
  Coins, 
  UserPlus, 
  Clock, 
  Trash2, 
  ArrowRight, 
  Inbox
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { idb } from '../services/appStorage';

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  time: string;
  unread: boolean;
  type?: 'transaction' | 'system' | 'currency' | 'invite';
  token?: string;
}

export const READ_STORAGE_KEY = 'hissaby_read_notifications_v1';
export const DISMISSED_STORAGE_KEY = 'hissaby_dismissed_notifications_v1';
export const NOTIFS_CACHE_KEY = 'hissaby_notifications_cache_v1';

export function getStoredReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(READ_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function saveStoredReadIds(ids: Set<string>): void {
  try {
    localStorage.setItem(READ_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getStoredDismissedIds(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch {}
  return new Set();
}

export function saveStoredDismissedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_STORAGE_KEY, JSON.stringify(Array.from(ids)));
  } catch {}
}

export function getCachedNotifications(): NotificationItem[] {
  try {
    const raw = localStorage.getItem(NOTIFS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const readIds = getStoredReadIds();
        const dismissedIds = getStoredDismissedIds();
        return parsed
          .filter((n: NotificationItem) => !dismissedIds.has(n.id))
          .map((n: NotificationItem) => ({
            ...n,
            unread: readIds.has(n.id) ? false : n.unread,
          }));
      }
    }
  } catch {}
  return [];
}

export function saveCachedNotifications(items: NotificationItem[]): void {
  try {
    localStorage.setItem(NOTIFS_CACHE_KEY, JSON.stringify(items));
    idb.set(NOTIFS_CACHE_KEY, items);
    window.dispatchEvent(new Event('hissaby_notifications_updated'));
  } catch {}
}

type FilterTab = 'all' | 'unread' | 'invite' | 'transaction' | 'system';

export const NotificationsView: React.FC = () => {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();

  // Instant display from cache (0ms perceived latency)
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => getCachedNotifications());
  const [loading, setLoading] = useState<boolean>(() => getCachedNotifications().length === 0);
  const [joiningToken, setJoiningToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

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
        const dismissedIds = getStoredDismissedIds();

        const filtered = rawNotifs
          .filter((n) => !dismissedIds.has(n.id))
          .map((n) => ({
            ...n,
            unread: readIds.has(n.id) ? false : n.unread,
          }));

        saveCachedNotifications(filtered);
        setNotifications(filtered);
      }
    } catch {
      // Offline fallback: keep cached items
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    idb.get<NotificationItem[]>(NOTIFS_CACHE_KEY).then((cached) => {
      if (cached && cached.length > 0 && notifications.length === 0) {
        const readIds = getStoredReadIds();
        const dismissedIds = getStoredDismissedIds();
        const filtered = cached
          .filter((n) => !dismissedIds.has(n.id))
          .map((n) => ({
            ...n,
            unread: readIds.has(n.id) ? false : n.unread,
          }));
        setNotifications(filtered);
      }
    });

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const markSingleAsRead = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const readIds = getStoredReadIds();
    readIds.add(id);
    saveStoredReadIds(readIds);

    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, unread: false } : n));
      saveCachedNotifications(updated);
      return updated;
    });
  };

  const markAllAsRead = () => {
    const readIds = getStoredReadIds();
    notifications.forEach((n) => readIds.add(n.id));
    saveStoredReadIds(readIds);

    setNotifications((prev) => {
      const updated = prev.map((n) => ({ ...n, unread: false }));
      saveCachedNotifications(updated);
      return updated;
    });
    toast.success('All notifications marked as read');
  };

  const dismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const dismissedIds = getStoredDismissedIds();
    dismissedIds.add(id);
    saveStoredDismissedIds(dismissedIds);

    setNotifications((prev) => {
      const updated = prev.filter((n) => n.id !== id);
      saveCachedNotifications(updated);
      return updated;
    });
    toast.success('Notification dismissed');
  };

  const clearAllRead = () => {
    const dismissedIds = getStoredDismissedIds();
    const readItems = notifications.filter((n) => !n.unread);
    readItems.forEach((n) => dismissedIds.add(n.id));
    saveStoredDismissedIds(dismissedIds);

    setNotifications((prev) => {
      const updated = prev.filter((n) => n.unread);
      saveCachedNotifications(updated);
      return updated;
    });
    toast.success('Cleared all read notifications');
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
        toast.success('Successfully joined the group!');
        navigate('/dashboard/teams');
      } else {
        toast.error(data.detail || data.error || 'Failed to accept invitation.');
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to accept invitation.');
    } finally {
      setJoiningToken(null);
    }
  };

  // Counts
  const unreadCount = notifications.filter((n) => n.unread).length;
  const inviteCount = notifications.filter((n) => n.type === 'invite').length;
  const transactionCount = notifications.filter((n) => n.type === 'transaction').length;

  // Filtered List
  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === 'unread') return n.unread;
    if (activeTab === 'invite') return n.type === 'invite';
    if (activeTab === 'transaction') return n.type === 'transaction';
    if (activeTab === 'system') return n.type === 'system' || n.type === 'currency';
    return true;
  });

  const getBadgeStyle = (type?: string) => {
    switch (type) {
      case 'invite':
        return {
          icon: UserPlus,
          bg: 'bg-purple-50 text-purple-600 border-purple-200',
          badgeBg: 'bg-purple-100/80 text-purple-700',
          label: 'Group Invite'
        };
      case 'transaction':
        return {
          icon: Receipt,
          bg: 'bg-emerald-50 text-emerald-600 border-emerald-200',
          badgeBg: 'bg-emerald-100/80 text-emerald-700',
          label: 'Transaction'
        };
      case 'currency':
        return {
          icon: Coins,
          bg: 'bg-amber-50 text-amber-600 border-amber-200',
          badgeBg: 'bg-amber-100/80 text-amber-700',
          label: 'Currency'
        };
      default:
        return {
          icon: Sparkles,
          bg: 'bg-blue-50 text-[#5391FE] border-blue-200',
          badgeBg: 'bg-blue-100/80 text-[#012456]',
          label: 'System'
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16 font-sans animate-fadeIn">
      
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div>
          <div className="flex items-center gap-2 text-[#5391FE] text-xs font-bold uppercase tracking-wider mb-1">
            <Bell className="w-4 h-4" />
            <span>Activity Center</span>
          </div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-[#012456] tracking-tight">
              Notifications
            </h2>
            {unreadCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-600 text-xs font-black animate-pulse">
                {unreadCount} unread
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 text-xs font-bold">
                All caught up
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time ledger updates, group invitations, and automated alerts.
          </p>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markAllAsRead}
              className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#5391FE] text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-2xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              <span>Mark all read</span>
            </button>
          )}

          {notifications.some((n) => !n.unread) && (
            <button
              type="button"
              onClick={clearAllRead}
              className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Clear read</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'all'
              ? 'bg-[#012456] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>All</span>
          <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
            activeTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
          }`}>
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'unread'
              ? 'bg-[#012456] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-md text-[10px] bg-rose-500 text-white font-black">
              {unreadCount}
            </span>
          )}
        </button>

        {inviteCount > 0 && (
          <button
            type="button"
            onClick={() => setActiveTab('invite')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
              activeTab === 'invite'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span>Invites</span>
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              activeTab === 'invite' ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
            }`}>
              {inviteCount}
            </span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab('transaction')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-2 ${
            activeTab === 'transaction'
              ? 'bg-[#012456] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>Transactions</span>
          {transactionCount > 0 && (
            <span className={`px-1.5 py-0.2 rounded-md text-[10px] ${
              activeTab === 'transaction' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {transactionCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('system')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0 ${
            activeTab === 'system'
              ? 'bg-[#012456] text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <span>System Alerts</span>
        </button>
      </div>

      {/* 3. Notifications List */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#5391FE] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-semibold animate-pulse">
            Loading notifications...
          </p>
        </div>
      ) : filteredNotifications.length === 0 ? (
        /* Empty State */
        <div className="rounded-3xl bg-white border border-slate-200 p-10 sm:p-14 text-center shadow-xs space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#5391FE] flex items-center justify-center mx-auto shadow-2xs">
            <Inbox className="w-7 h-7" />
          </div>
          <div className="max-w-sm mx-auto space-y-1.5">
            <h3 className="text-base font-black text-[#012456]">
              {activeTab === 'unread' ? 'No unread notifications' : 'No notifications in this filter'}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You are completely up to date with your finances, group invites, and cashflow alerts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-[#012456] text-xs font-bold transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Go to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => {
            const badge = getBadgeStyle(notif.type);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={notif.id}
                onClick={() => {
                  if (notif.unread) markSingleAsRead(notif.id);
                }}
                className={`rounded-2xl sm:rounded-3xl border transition-all p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  notif.unread
                    ? 'bg-white border-blue-200 shadow-xs border-l-4 border-l-[#5391FE]'
                    : 'bg-white/80 border-slate-200/90 hover:bg-white hover:border-slate-300'
                }`}
              >
                {/* Left content */}
                <div className="flex items-start gap-3.5 min-w-0">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${badge.bg}`}>
                    <BadgeIcon className="w-5 h-5" />
                  </div>

                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${badge.badgeBg}`}>
                        {badge.label}
                      </span>
                      {notif.unread && (
                        <span className="w-2 h-2 rounded-full bg-[#5391FE] shrink-0" />
                      )}
                      <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3" />
                        <span>{notif.time}</span>
                      </span>
                    </div>

                    <h3 className={`text-sm sm:text-base tracking-tight ${
                      notif.unread ? 'font-black text-[#012456]' : 'font-bold text-slate-800'
                    }`}>
                      {notif.title}
                    </h3>

                    <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">
                      {notif.message}
                    </p>

                    {/* Interactive Group Invite Action */}
                    {notif.type === 'invite' && notif.token && (
                      <div className="pt-2 flex items-center gap-2">
                        <button
                          type="button"
                          disabled={joiningToken === notif.token}
                          onClick={(e) => acceptInvite(notif.token!, notif.id, e)}
                          className="px-4 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:opacity-50 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>{joiningToken === notif.token ? 'Joining...' : 'Accept Invitation'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => dismissNotification(notif.id, e)}
                          className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold transition-all cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right controls */}
                <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                  {notif.unread ? (
                    <button
                      type="button"
                      onClick={(e) => markSingleAsRead(notif.id, e)}
                      title="Mark as read"
                      className="p-2 rounded-xl hover:bg-blue-50 text-slate-400 hover:text-[#5391FE] transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={(e) => dismissNotification(notif.id, e)}
                    title="Dismiss alert"
                    className="p-2 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NotificationsView;
