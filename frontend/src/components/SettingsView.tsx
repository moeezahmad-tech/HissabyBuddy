import React from 'react';
import { ShieldCheck, User, CheckCircle2, LogIn, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const SettingsView: React.FC = () => {
  const { user, signInWithGoogle, signOut } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h2 className="text-2xl font-black text-[#012456] tracking-tight flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-[#5391FE]" />
          Secure Authentication &amp; Data Isolation
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in securely using Firebase Auth to keep your financial records private and separated per user.
        </p>
      </div>

      <div className="rounded-3xl bg-white border border-slate-200 shadow-xs p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#012456] flex items-center gap-2">
            <User className="w-4 h-4 text-[#5391FE]" />
            Active Authentication Session
          </h3>
          {user ? (
            <button
              onClick={signOut}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1.5 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          ) : (
            <button
              onClick={signInWithGoogle}
              className="px-4 py-2 rounded-xl bg-[#5391FE] text-white text-xs font-bold flex items-center gap-2 hover:bg-[#437de0] transition-colors cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Continue with Google</span>
            </button>
          )}
        </div>

        {user ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium">User Identity (UID)</span>
              <p className="font-mono text-slate-900 font-bold mt-1 truncate">{user.uid}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium">Authenticated Email</span>
              <p className="font-semibold text-slate-900 mt-1 truncate">{user.email}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium">Firestore Tenancy Isolation</span>
              <p className="font-semibold text-emerald-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Active Per-User Namespace
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <span className="text-slate-400 font-medium">Pinecone Metadata Scope</span>
              <p className="font-semibold text-[#5391FE] mt-1 font-mono">{`{"userId": "${user.uid}"}`}</p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200">
            <p className="text-xs text-slate-600 mb-4">
              No authenticated session active. Sign in with Google to isolate your vector database records, bank statement embeddings, and transaction logs.
            </p>
            <button
              onClick={signInWithGoogle}
              className="inline-flex items-center gap-2.5 px-5 py-3 rounded-xl bg-white border border-slate-200 hover:border-[#5391FE] text-slate-700 text-xs font-bold shadow-xs hover:shadow transition-all cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsView;
