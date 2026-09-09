import React, { useState } from 'react';
import { Sparkles, RefreshCw, X, ArrowUpCircle } from 'lucide-react';
import { useAppUpdate } from '../hooks/useAppUpdate';

export const AppUpdatePrompt: React.FC = () => {
  const { isUpdateAvailable, applyUpdate, dismissUpdate, version } = useAppUpdate();
  const [isUpdating, setIsUpdating] = useState(false);

  if (!isUpdateAvailable) return null;

  const handleUpdate = async () => {
    setIsUpdating(true);
    await applyUpdate();
  };

  return (
    <aside
      aria-label="Application Update Notice"
      className="fixed bottom-20 sm:bottom-6 right-3 sm:right-6 z-50 max-w-sm w-[calc(100%-1.5rem)] sm:w-auto animate-fadeIn"
    >
      <div className="p-4 rounded-2xl sm:rounded-3xl bg-[#012456] text-white shadow-2xl border border-blue-400/20 backdrop-blur-xl flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#5391FE] text-white flex items-center justify-center shrink-0 shadow-xs">
              <Sparkles className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <h4 className="text-xs font-black tracking-tight text-white flex items-center gap-1.5">
                <span>Update Ready</span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/30 text-blue-200 text-[10px] font-bold">
                  {version}
                </span>
              </h4>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                A new version of Hissaby Buddy is available with fresh improvements.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dismissUpdate}
            title="Dismiss update notice"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={isUpdating}
            onClick={handleUpdate}
            className="flex-1 px-3.5 py-2 rounded-xl bg-[#5391FE] hover:bg-[#437de0] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {isUpdating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowUpCircle className="w-3.5 h-3.5" />
            )}
            <span>{isUpdating ? 'Updating App...' : 'Update Now'}</span>
          </button>

          <button
            type="button"
            onClick={dismissUpdate}
            className="px-3 py-2 rounded-xl border border-white/10 hover:bg-white/10 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Later
          </button>
        </div>
      </div>
    </aside>
  );
};

export default AppUpdatePrompt;
