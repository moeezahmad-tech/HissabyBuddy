import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, X, LogOut, ArrowRight, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWADownloadModal } from './PWADownloadModal';

interface HeaderNavProps {
  onOpenApp?: () => void;
  isAppMode?: boolean;
}

export const HeaderNav: React.FC<HeaderNavProps> = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, signOut } = useAuth();
  const { isInstalled, isIOS, showGuideModal, setShowGuideModal, installApp } = usePWAInstall();
  const location = useLocation();

  const isLoginPage = location.pathname.includes('/login');

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 sm:h-20">
            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3">
              <a href="/" className="flex items-center gap-2.5 sm:gap-3 group">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white border border-slate-200 p-1 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-[#5391FE] transition-colors">
                  <img
                    src="/logo.png"
                    alt="Hissaby Buddy Logo"
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
                  <span className="text-lg sm:text-xl font-black text-[#012456] tracking-tight flex items-center gap-1">
                    Hissaby <span className="text-[#5391FE]">Buddy</span>
                  </span>
                  <span className="block text-[9px] sm:text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Financial AI Copilot
                  </span>
                </div>
              </a>
            </div>

            {/* Desktop Navigation Links */}
            {!isLoginPage && (
              <nav className="hidden md:flex items-center gap-6 text-xs lg:text-sm font-bold text-slate-600">
                <Link to="/dashboard" className="hover:text-[#5391FE] transition-colors">
                  Dashboard
                </Link>
                <Link to="/about" className="hover:text-[#5391FE] transition-colors">
                  About
                </Link>
                <Link to="/techkreative" className="hover:text-[#5391FE] transition-colors">
                  Creator
                </Link>
                <Link to="/contact" className="hover:text-[#5391FE] transition-colors">
                  Contact
                </Link>
              </nav>
            )}

            {/* Right Action Buttons - Exactly 2 Buttons */}
            {!isLoginPage && (
              <div className="flex items-center gap-2 sm:gap-3">
                {user ? (
                  <>
                    {/* Button 1: User / Dashboard link */}
                    <Link
                      to="/dashboard"
                      className="flex items-center gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-50 border border-slate-200 hover:border-[#5391FE] transition-all cursor-pointer shadow-2xs"
                    >
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#012456] text-white font-bold flex items-center justify-center text-[10px] sm:text-xs select-none">
                        {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold text-[#012456] truncate max-w-[90px] sm:max-w-[120px]">
                        {user.displayName?.split(' ')[0] || user.email?.split('@')[0] || 'Dashboard'}
                      </span>
                    </Link>

                    {/* Button 2: Sign Out (desktop) or Hamburger Toggle (mobile) */}
                    <button
                      onClick={signOut}
                      title="Sign Out"
                      className="hidden md:flex p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setMobileOpen(!mobileOpen)}
                      className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title="Toggle Menu"
                    >
                      {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                  </>
                ) : (
                  <>
                    {/* Button 1: Sign In */}
                    <Link
                      to="/login"
                      className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-[#012456] hover:bg-slate-100 transition-all cursor-pointer"
                    >
                      Sign In
                    </Link>

                    {/* Button 2: Get Started (on desktop) / Menu or Get Started (on mobile) */}
                    <Link
                      to="/login"
                      className="hidden sm:inline-flex px-4 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all shadow-xs hover:shadow-sm items-center gap-1.5 cursor-pointer"
                    >
                      <span>Get Started</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <button
                      onClick={() => setMobileOpen(!mobileOpen)}
                      className="sm:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title="Toggle Menu"
                    >
                      {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Panel */}
        {mobileOpen && !isLoginPage && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-4 shadow-lg animate-fadeIn">
            <nav className="flex flex-col gap-3 font-bold text-slate-600 text-xs">
              <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="py-2 hover:text-[#5391FE] transition-colors border-b border-slate-50">
                Dashboard
              </Link>
              <Link to="/about" onClick={() => setMobileOpen(false)} className="py-2 hover:text-[#5391FE] transition-colors border-b border-slate-50">
                About
              </Link>
              <Link to="/techkreative" onClick={() => setMobileOpen(false)} className="py-2 hover:text-[#5391FE] transition-colors border-b border-slate-50">
                Creator
              </Link>
              <Link to="/contact" onClick={() => setMobileOpen(false)} className="py-2 hover:text-[#5391FE] transition-colors">
                Contact
              </Link>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              {user ? (
                <>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#012456] text-white font-bold flex items-center justify-center text-xs select-none">
                      {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-[#012456] truncate max-w-[150px]">
                      {user.displayName || user.email}
                    </span>
                  </div>
                  <button
                    onClick={() => { signOut(); setMobileOpen(false); }}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-2 w-full">
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full text-center py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/login"
                    onClick={() => setMobileOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-[#5391FE] text-white text-xs font-bold transition-all shadow-xs hover:bg-[#437de0] flex items-center justify-center gap-2"
                  >
                    <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                      <path d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z" />
                      <path d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z" />
                      <path d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z" />
                      <path d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z" />
                    </svg>
                    <span>Continue with Google</span>
                  </Link>
                </div>
              )}
            </div>

            {!isInstalled && (
              <div className="pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    installApp();
                  }}
                  className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-[#012456] border border-blue-200 text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
                >
                  <Download className="w-4 h-4 text-[#5391FE]" />
                  <span>Download / Install App</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      <PWADownloadModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};

export default HeaderNav;
