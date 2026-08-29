import React, { useState } from 'react';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface HeaderNavProps {
  onOpenApp?: () => void;
  isAppMode?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, openAuthModal, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-3 group">
              <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-1 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-[#5391FE] transition-colors">
                <img
                  src="/logo.png"
                  alt="Hisaaby Buddy Logo"
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    if (target.parentElement) {
                      target.parentElement.innerHTML = '<span class="text-[#5391FE] font-black text-xl">HB</span>';
                    }
                  }}
                />
              </div>
              <div>
                <span className="text-xl font-black text-[#012456] tracking-tight flex items-center gap-1">
                  Hisaaby <span className="text-[#5391FE]">Buddy</span>
                </span>
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Financial AI Copilot
                </span>
              </div>
            </a>
          </div>

          {/* Desktop Navigation Links to Dedicated Feature Sections */}
          <nav className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-semibold text-slate-600">
            <a href="#feature-document-upload" className="hover:text-[#5391FE] transition-colors">
              Smart Upload &amp; OCR
            </a>
            <a href="#feature-ai-assistant" className="hover:text-[#5391FE] transition-colors">
              AI Copilot
            </a>
            <a href="#feature-dashboard" className="hover:text-[#5391FE] transition-colors">
              Dashboard
            </a>
            <a href="#feature-auth-security" className="hover:text-[#5391FE] transition-colors">
              Security
            </a>
            <a href="#feature-transaction-logging" className="hover:text-[#5391FE] transition-colors">
              Ledger
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[#012456] text-white font-bold flex items-center justify-center text-xs">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-bold text-[#012456] truncate max-w-[120px]">
                    {user.displayName || user.email}
                  </span>
                </div>
                <button
                  onClick={signOut}
                  title="Sign Out"
                  className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={openAuthModal}
                className="px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-[#5391FE] text-slate-700 text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                  <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                </svg>
                <span>Continue with Google</span>
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default HeaderNav;
