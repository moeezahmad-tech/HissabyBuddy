import React from 'react';
import { 
  LayoutDashboard, 
  Bot, 
  Repeat, 
  UploadCloud, 
  Settings, 
  Sparkles,
  ArrowLeft,
  ShieldCheck,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  onBackToLanding?: () => void;
}

export const SidebarNavigation: React.FC<SidebarProps> = ({ 
  activeView, 
  setActiveView, 
  onBackToLanding
}) => {
  const { user, openAuthModal, signOut } = useAuth();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'recurring', label: 'Recurring Money', icon: Repeat, badge: 'Bills & Rent' },
    { id: 'assistant', label: 'AI Financial Assistant', icon: Bot, badge: 'Smart AI' },
    { id: 'upload', label: 'Document Upload', icon: UploadCloud, badge: 'Auto-Sync' },
    { id: 'settings', label: 'Account & Security', icon: Settings },
  ];

  return (
    <aside className="w-72 h-screen bg-white border-r border-slate-200 flex flex-col justify-between p-5 fixed left-0 top-0 z-40 overflow-y-auto no-scrollbar">
      <div>
        {/* Brand Logo & Name */}
        <div className="flex items-center gap-3 pb-5 border-b border-slate-200">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center p-1 overflow-hidden group hover:border-[#5391FE] transition-colors shrink-0">
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
            <h1 className="text-base font-black text-[#012456] tracking-tight flex items-center gap-1">
              Hissaby <span className="text-[#5391FE]">Buddy</span>
            </h1>
            <p className="text-[10px] font-bold tracking-wider text-slate-500 uppercase">
              Financial AI Copilot
            </p>
          </div>
        </div>

        {/* Back to Landing page button */}
        {onBackToLanding && (
          <button
            onClick={onBackToLanding}
            className="mt-3.5 w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home &amp; Features</span>
          </button>
        )}

        {/* Navigation Items */}
        <nav className="mt-5 space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id)}
                className={`w-full relative flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-bold transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-[#5391FE]/10 text-[#5391FE]'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#5391FE]' : 'text-slate-500'}`} />
                  <span className="whitespace-nowrap truncate">{item.label}</span>
                </div>

                {item.badge && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider shrink-0 ml-1.5 ${
                    isActive ? 'bg-[#5391FE] text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {isActive && (
                  <div className="absolute left-0 w-1.5 h-6 bg-[#5391FE] rounded-r-full" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Pinecone Status + User Auth Profile */}
      <div className="pt-4 space-y-3 border-t border-slate-100">
        {/* Smart Insights Status Card */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left space-y-1">
          <div className="flex items-center justify-between text-[#5391FE] text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Smart Financial Assistant</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[10px] text-slate-500 leading-snug">
            Bank-grade privacy &amp; instant insights active
          </p>
        </div>

        {/* Dynamic User Profile or Continue with Google Button */}
        {user ? (
          <div className="flex items-center justify-between p-2 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition-colors shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt={user.displayName} 
                  className="w-9 h-9 rounded-xl object-cover border border-slate-200 shrink-0" 
                />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-[#012456] text-white font-bold flex items-center justify-center text-xs shadow-xs shrink-0">
                  {(user.displayName || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 text-left">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1 truncate">
                  <span className="truncate">{user.displayName || user.email}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-[#5391FE] shrink-0" />
                </div>
                <span className="text-[10px] text-slate-400 font-semibold block truncate">
                  {user.email || 'Authenticated User'}
                </span>
              </div>
            </div>

            <button 
              title="Sign Out"
              aria-label="Sign Out"
              onClick={signOut}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={openAuthModal}
            className="w-full py-3 px-3 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-[#5391FE] text-slate-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-2xs hover:shadow-xs cursor-pointer"
          >
            {/* Google SVG Icon */}
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24Z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15Z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98Z"
              />
            </svg>
            <span className="truncate">Continue with Google</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default SidebarNavigation;
