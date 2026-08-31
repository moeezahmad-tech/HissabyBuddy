import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Lock,
  Mail,
  User,
  ArrowLeft,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import HeaderNav from './HeaderNav';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    authError,
    clearAuthError,
    loading: authLoading
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // If already logged in, redirect to dashboard or process invite token
  useEffect(() => {
    if (user) {
      const searchParams = new URLSearchParams(location.search);
      const inviteToken = searchParams.get('invite');
      if (inviteToken) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        fetch(`${apiUrl}/api/workspaces/invitations/${inviteToken}/accept`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(user.token ? { 'Authorization': `Bearer ${user.token}` } : {})
          }
        })
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
              localStorage.removeItem('hissaby_cached_workspaces');
              navigate(`/dashboard/teams`, { replace: true });
            } else {
              navigate('/dashboard/teams', { replace: true });
            }
          })
          .catch(() => {
            navigate('/dashboard/teams', { replace: true });
          });
      } else {
        const from = (location.state as any)?.from?.pathname || '/dashboard';
        navigate(from, { replace: true });
      }
    }
  }, [user, navigate, location]);

  // Clear errors when switching modes
  const handleModeSwitch = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    clearAuthError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(email.trim(), password, name.trim() || undefined);
      }
    } catch {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      // Handled in context
    } finally {
      setSubmitting(false);
    }
  };

  const isLoading = authLoading || submitting;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Official Website Navigation Bar */}
      <HeaderNav />

      <div className="flex-grow flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background ambient accents */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-sky-100/60 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          {/* Brand Header */}
          <div className="text-center">

            <h2 className="mt-6 text-2xl font-black text-[#012456] tracking-tight">
              {mode === 'signin' ? 'Welcome Back!' : 'Create Your Account'}
            </h2>
            <p className="mt-1 text-xs text-slate-500 max-w-xs mx-auto">
              {mode === 'signin'
                ? 'Access your personal ledger, AI financial insights, and collaborative groups.'
                : 'Start effortlessly tracking expenses, budgets, and family groceries today.'}
            </p>
          </div>

          {/* Main Card */}
          <div className="mt-8 bg-white py-8 px-6 shadow-xl shadow-slate-200/50 sm:rounded-3xl border border-slate-200/80 sm:px-10">

            {/* Mode Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => handleModeSwitch('signin')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'signin'
                    ? 'bg-white text-[#012456] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeSwitch('signup')}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'signup'
                    ? 'bg-white text-[#012456] shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                  }`}
              >
                Create Account
              </button>
            </div>

            {/* Auth Error Display */}
            {authError && (
              <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <span className="font-semibold">{authError}</span>
                </div>
              </div>
            )}

            {/* 1. Google 1-Click Button */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <RefreshCw className="w-4 h-4 text-[#5391FE] animate-spin" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">or continue with email</span>
              </div>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Moeez Ahmad"
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-[#5391FE] focus:ring-2 focus:ring-[#5391FE]/20 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>{mode === 'signin' ? 'Sign In to Dashboard' : 'Create Account & Get Started'}</span>
                )}
              </button>
            </form>

            {/* Security Assurance */}
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Bank-Grade 256-bit AES Encryption via Firebase Auth</span>
            </div>
          </div>

          {/* Feature Highlights beneath Card */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="p-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/60">
              <Sparkles className="w-4 h-4 text-[#5391FE] mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#012456]">AI Statement OCR</p>
              <p className="text-[9px] text-slate-400">Instant extraction</p>
            </div>
            <div className="p-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/60">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#012456]">Team &amp; Rashan</p>
              <p className="text-[9px] text-slate-400">Fair bill splits</p>
            </div>
            <div className="p-3 bg-white/70 backdrop-blur-xs rounded-2xl border border-slate-200/60">
              <Lock className="w-4 h-4 text-purple-500 mx-auto mb-1" />
              <p className="text-[11px] font-bold text-[#012456]">Data Privacy</p>
              <p className="text-[9px] text-slate-400">Per-user isolation</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
