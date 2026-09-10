import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, CheckCircle2, LogOut, RefreshCw, Sun, Moon, Info, Sparkles, ArrowUpCircle } from 'lucide-react';
import { useAuth, PROFILE_CACHE_KEY, syncProfileCache } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useAppUpdate } from '../hooks/useAppUpdate';
import CurrencySelector from './CurrencySelector';
import { ConfirmModal } from './ConfirmModal';

const getCachedProfile = () => {
  try {
    const saved = localStorage.getItem(PROFILE_CACHE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return null;
};

export const SettingsView: React.FC = () => {
  const { user, signInWithGoogle, signOut, updateUserLocal } = useAuth();
  const toast = useToast();

  const cached = getCachedProfile();

  // Profile Form State - Instantaneously loaded from localStorage or user session
  const [displayName, setDisplayName] = useState(
    cached?.displayName || (user?.displayName && user.displayName !== 'User' ? user.displayName : '')
  );
  const [email, setEmail] = useState(
    cached?.email || (user?.email && !user.email.includes('@hissaby.local') ? user.email : '')
  );
  const [about, setAbout] = useState(cached?.about || '');
  const [darkMode, setDarkMode] = useState(cached?.darkMode ?? true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);

  const {
    version,
    channel,
    isUpdateAvailable,
    isChecking,
    lastChecked,
    checkForUpdate,
    applyUpdate,
    forceRefresh
  } = useAppUpdate();

  // Sync with SQL database quietly in the background (stale-while-revalidate, non-blocking)
  useEffect(() => {
    if (!user) return;

    // First load from localStorage cache
    const local = getCachedProfile();
    if (local) {
      if (local.displayName) setDisplayName(local.displayName);
      if (local.email) setEmail(local.email);
      if (local.about !== undefined) setAbout(local.about);
      if (local.darkMode !== undefined) setDarkMode(local.darkMode);
    } else {
      if (user.displayName && user.displayName !== 'User') {
        setDisplayName(user.displayName);
      }
      if (user.email && !user.email.includes('@hissaby.local')) {
        setEmail(user.email);
      }
    }

    // Silent background fetch to ensure local storage has latest DB preferences
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/auth/me`, {
      headers: {
        ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
        ...(user.uid ? { 'X-User-Id': user.uid } : {}),
        ...(user.email && !user.email.includes('@hissaby.local') ? { 'X-User-Email': user.email } : {}),
        ...(user.displayName && user.displayName !== 'User' ? { 'X-User-Name': user.displayName } : {}),
      },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'authenticated' && data.profile) {
          const prof = data.profile;
          const freshName = prof.display_name && prof.display_name !== 'User' && prof.display_name !== 'Authenticated User'
            ? prof.display_name
            : (user.displayName && user.displayName !== 'User' ? user.displayName : '');
          const freshEmail = prof.email && !prof.email.includes('@hissaby.local')
            ? prof.email
            : (user.email && !user.email.includes('@hissaby.local') ? user.email : '');
          const freshAbout = prof.preferences?.about || '';
          const freshDarkMode = prof.dark_mode !== undefined ? prof.dark_mode : true;

          if (freshName) setDisplayName(freshName);
          if (freshEmail) setEmail(freshEmail);
          if (freshAbout) setAbout(freshAbout);
          setDarkMode(freshDarkMode);

          syncProfileCache({
            displayName: freshName,
            email: freshEmail,
            about: freshAbout,
            darkMode: freshDarkMode,
          });
        }
      })
      .catch(() => {});
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(null);

    const updatedProfile = {
      displayName: displayName.trim(),
      email: email.trim() || undefined,
      about: about.trim(),
      darkMode: darkMode,
    };

    // 1. Immediately write to localStorage so future visits are instantly up-to-date
    syncProfileCache(updatedProfile);

    // 2. Immediately update local React auth context
    await updateUserLocal(displayName.trim(), email.trim() || undefined);

    setSaveSuccess('Profile settings updated and saved locally!');
    toast.success('Profile settings updated successfully!');
    setTimeout(() => setSaveSuccess(null), 4000);

    // 3. Persist to database in background
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
          ...(user.uid ? { 'X-User-Id': user.uid } : {}),
          ...(user.email && !user.email.includes('@hissaby.local') ? { 'X-User-Email': user.email } : {}),
          ...(user.displayName && user.displayName !== 'User' ? { 'X-User-Name': user.displayName } : {}),
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim() || undefined,
          about: about.trim(),
          dark_mode: darkMode,
        }),
      });
    } catch {
      // Offline fallback: already saved in localStorage and local context
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 animate-fadeIn">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-black text-[#012456] tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#5391FE]" />
          Account &amp; Security
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Manage your profile settings, app preferences, and Firebase authentication session.
        </p>
      </div>

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Form options */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-5">
            <div>
              <h3 className="text-sm font-black text-[#012456] flex items-center gap-2">
                <User className="w-4 h-4 text-[#5391FE]" />
                User Profile Settings
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">Customize your public display name, email notification parameters, and personal bio details.</p>
            </div>

            {user ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Display Name</label>
                      <input
                        type="text"
                        required
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="e.g. Moeez Ahmad"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">Email Address</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@hissaby.pk"
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-[#5391FE]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">About Me (Bio)</label>
                    <textarea
                      value={about}
                      onChange={(e) => setAbout(e.target.value)}
                      placeholder="Briefly describe your financial role or organization..."
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 resize-none focus:outline-none focus:border-[#5391FE]"
                    />
                  </div>

                  {/* Currency preference section */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Default Currency</p>
                      <p className="text-[10px] text-slate-400">Select base currency format for your transactions and KPIs.</p>
                    </div>
                    <div>
                      <CurrencySelector />
                    </div>
                  </div>

                  {/* Theme toggle section */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-700">App Theme Settings</p>
                      <p className="text-[10px] text-slate-400">Toggle dark mode preferences for the ledger.</p>
                    </div>
                    <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100">
                      <button
                        type="button"
                        onClick={() => setDarkMode(true)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          darkMode ? 'bg-white text-[#012456] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Moon className="w-3.5 h-3.5" />
                        <span>Dark</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setDarkMode(false)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          !darkMode ? 'bg-white text-[#012456] shadow-xs' : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        <Sun className="w-3.5 h-3.5" />
                        <span>Light</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-5 py-2.5 rounded-xl bg-[#5391FE] hover:bg-[#437de0] disabled:bg-slate-200 text-white text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-2xs hover:shadow-xs"
                    >
                      {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                      <span>Save Profile Changes</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-6 text-center bg-slate-50 rounded-2xl border border-slate-200">
                <p className="text-xs text-slate-600 mb-4">You need to sign in to configure your user profile details.</p>
                <button
                  onClick={signInWithGoogle}
                  className="px-4 py-2 bg-[#5391FE] text-white text-xs font-bold rounded-xl hover:bg-[#437de0] transition-colors"
                >
                  Continue with Google
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Session Scope & Tenure */}
        <div className="space-y-6">
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#012456] uppercase tracking-wider">Active Session</h4>
              {user && (
                <button
                  onClick={signOut}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Sign Out
                </button>
              )}
            </div>

            {user ? (
              <div className="space-y-3 text-[10px]">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-bold block">Firebase UID</span>
                  <p className="font-mono text-slate-800 font-bold mt-0.5 truncate">{user.uid}</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-slate-400 font-bold block">Isolation Metadata</span>
                  <p className="font-semibold text-emerald-600 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Strict Tenancy Sandbox Active
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500">No active login session detected.</p>
            )}
          </div>

          {/* App Version & Updates Card */}
          <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#012456] uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
                <span>App Updates &amp; Version</span>
              </h4>
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-[#5391FE] text-[10px] font-black">
                {version}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Channel:</span>
                <span className="font-bold text-[#012456]">{channel}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Last Checked:</span>
                <span className="font-semibold text-slate-700">{lastChecked || 'Just now'}</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-slate-500 font-medium">Status:</span>
                {isUpdateAvailable ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-bold text-[10px] flex items-center gap-1">
                    <ArrowUpCircle className="w-3 h-3" />
                    <span>Update Ready</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 font-bold text-[10px] flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Up to date</span>
                  </span>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {isUpdateAvailable ? (
                <button
                  type="button"
                  onClick={applyUpdate}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>Install Update &amp; Reload</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isChecking}
                  onClick={async () => {
                    const hasUpdate = await checkForUpdate();
                    if (!hasUpdate) {
                      toast.success('Hissaby Buddy is already up to date!');
                    } else {
                      toast.success('New update found! Click Install Update.');
                    }
                  }}
                  className="w-full py-2 px-4 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-[#5391FE] ${isChecking ? 'animate-spin' : ''}`} />
                  <span>{isChecking ? 'Checking for Updates...' : 'Check for Updates'}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowReloadConfirm(true)}
                className="w-full text-center text-[11px] text-slate-400 hover:text-slate-600 transition-colors py-1 cursor-pointer font-medium"
              >
                Force Reload &amp; Clear Cache
              </button>
            </div>
          </div>

          <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100 flex gap-2.5 items-start">
            <Info className="w-4.5 h-4.5 text-[#5391FE] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#012456] leading-relaxed">
              <strong>Database Integrity:</strong> Your bio information, currency preferences, and theme choices are linked to your Firebase session credentials and stored securely within an isolated schema inside our Neon PostgreSQL server.
            </p>
          </div>
        </div>
      </div>

      {/* Custom Confirmation Modal for Force Reload */}
      <ConfirmModal
        isOpen={showReloadConfirm}
        onClose={() => setShowReloadConfirm(false)}
        onConfirm={() => {
          setShowReloadConfirm(false);
          forceRefresh();
        }}
        title="Force Reload & Clear Cache"
        message="Are you sure you want to force reload and clear all cached web app assets? The app will refresh and load the latest bundle."
        confirmText="Reload App"
        variant="warning"
      />
    </div>
  );
};

export default SettingsView;
