import React from 'react';
import { Download, CheckCircle2, Sparkles, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWADownloadModal } from './PWADownloadModal';

export const PWABanner: React.FC = () => {
  const { isInstalled, isIOS, showGuideModal, setShowGuideModal, installApp } = usePWAInstall();

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#012456] via-[#02337a] to-[#012456] text-white p-6 sm:p-10 shadow-2xl border border-blue-400/20">
          {/* Ambient decorative glow */}
          <div className="absolute -right-20 -top-20 w-80 h-80 bg-[#5391FE]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-sky-400/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-8">
            {/* Left Content */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-white/10 backdrop-blur-md border border-white/20 p-3 shadow-inner flex items-center justify-center shrink-0">
                <img
                  src="/logo.png"
                  alt="Hissaby Buddy"
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>

              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-[11px] font-bold text-blue-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-[#5391FE]" />
                  <span>Progressive Web App (PWA)</span>
                  <span className="text-white/60">• Zero App Store Hassle</span>
                </div>

                <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
                  Get Hissaby Buddy on Your Phone
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-300 font-normal leading-relaxed">
                  Install directly from your browser to your Home Screen. Instant startup, offline caching, and responsive native mobile performance.
                </p>

                {/* Quick specs pill */}
                <div className="mt-4 flex flex-wrap items-center justify-center sm:justify-start gap-3 text-[11px] text-slate-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Android &amp; iOS Safari
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    No 100MB download
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    Real-time cloud sync
                  </span>
                </div>
              </div>
            </div>

            {/* Right Action Button */}
            <div className="shrink-0 flex flex-col items-center sm:items-end gap-2 w-full sm:w-auto">
              {isInstalled ? (
                <div className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>App Already Installed</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={installApp}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white text-sm font-black shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 cursor-pointer group"
                >
                  <Download className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Download / Install App</span>
                  <ArrowRight className="w-4 h-4 text-blue-200" />
                </button>
              )}
              <span className="text-[10px] text-slate-400 text-center sm:text-right">
                Works on Chrome, Edge, Safari &amp; Samsung Internet
              </span>
            </div>
          </div>
        </div>
      </div>

      <PWADownloadModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};

export default PWABanner;
