import React, { useState, useEffect } from 'react';
import { ShieldCheck, User, CheckCircle2, LogOut, RefreshCw, Sun, Moon, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, signInWithGoogle, signOut } = useAuth();

  // Profile Form State
  const [displayName, setDisplayName] = useState(user?.displayName || 'User');
  const [email, setEmail] = useState(user?.email || '');
  const [about, setAbout] = useState('');
  const [darkMode, setDarkMode] = useState(true);
  
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Fetch current user details from SQL database on load
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    fetch(`${apiUrl}/api/auth/me`, {
      headers: user.token ? { Authorization: `Bearer ${user.token}` } : {},
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'authenticated' && data.profile) {
          const prof = data.profile;
          if (prof.display_name) setDisplayName(prof.display_name);
          if (prof.email) setEmail(prof.email);
          if (prof.preferences?.about) setAbout(prof.preferences.about);
          if (prof.dark_mode !== undefined) setDarkMode(prof.dark_mode);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [user]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(user.token ? { Authorization: `Bearer ${user.token}` } : {}),
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
          email: email.trim() || undefined,
          about: about.trim(),
          dark_mode: darkMode,
        }),
      });
      const data = await response.json();
      if (data.status === 'success') {
        setSaveSuccess('Profile preferences updated in the database!');
        setTimeout(() => setSaveSuccess(null), 4000);
      }
    } catch {
      alert('Failed to save profile settings.');
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

          <div className="p-4 rounded-3xl bg-blue-50 border border-blue-100 flex gap-2.5 items-start">
            <Info className="w-4.5 h-4.5 text-[#5391FE] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#012456] leading-relaxed">
              <strong>Database Integrity:</strong> Your bio information, currency preferences, and theme choices are linked to your Firebase session credentials and stored securely within an isolated schema inside our Neon PostgreSQL server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsView;
