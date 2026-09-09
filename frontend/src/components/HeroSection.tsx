import React from 'react';
import { 
  ArrowRight, 
  UploadCloud, 
  Bot, 
  LayoutDashboard, 
  ShieldCheck,
  Download
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { PWADownloadModal } from './PWADownloadModal';

interface HeroSectionProps {
  onOpenApp?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenApp }) => {
  const { isInstalled, isIOS, showGuideModal, setShowGuideModal, installApp } = usePWAInstall();

  return (
    <>
      <section className="relative min-h-[calc(100vh-5rem)] flex-1 flex flex-col justify-center py-6 sm:py-10 overflow-hidden bg-white">
        {/* Decorative gradient backdrops */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-transparent blur-2xl -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="text-center max-w-4xl mx-auto flex flex-col justify-center items-center">
            {/* Main Headline */}
            <h1 className="text-2xl sm:text-5xl lg:text-6xl font-black text-[#012456] tracking-tight leading-snug sm:leading-[1.15] text-balance">
              <span className="sm:hidden">Smart Finances with <span className="text-[#5391FE]">AI</span> &amp; Instant Insights</span>
              <span className="hidden sm:inline">Smart Financial Decisions Made Effortless with <span className="text-[#5391FE]">AI</span> &amp; <span className="underline decoration-[#5391FE] decoration-4 underline-offset-8">Instant Insights</span></span>
            </h1>

            {/* Subheading with user-first benefits */}
            <p className="mt-3 sm:mt-5 text-sm sm:text-lg text-slate-600 font-normal leading-relaxed text-pretty max-w-2xl sm:max-w-3xl mx-auto">
              Upload bank statements, track spending habits, and get instant answers with your real-time AI financial copilot.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
              {onOpenApp && (
                <button
                  onClick={onOpenApp}
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer"
                >
                  <span>Get Started Free</span>
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
              )}

              {/* PWA Download Button on Home Screen */}
              {!isInstalled && (
                <button
                  type="button"
                  onClick={installApp}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-[#012456] hover:bg-[#023173] text-white font-bold text-sm transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer border border-[#012456]"
                >
                  <Download className="w-4 h-4 text-[#5391FE]" />
                  <span>Download App</span>
                  <span className="text-[10px] uppercase font-black bg-[#5391FE] px-2 py-0.5 rounded-full text-white">
                    PWA
                  </span>
                </button>
              )}

              <a
                href="#feature-document-upload"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-[#012456] font-bold text-sm transition-all border border-slate-300 shadow-xs hover:border-[#5391FE] flex items-center justify-center gap-2"
              >
                <span>Explore Features</span>
                <ArrowRight className="w-4 h-4 text-[#5391FE]" />
              </a>
            </div>

            {/* Trust & Spec Badges */}
            <div className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 text-left">
              <div className="flex items-center gap-2.5 p-2.5 sm:p-3 rounded-xl bg-slate-50 border border-slate-100">
                <UploadCloud className="w-5 h-5 text-[#5391FE] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#012456]">Statement Upload</p>
                  <p className="text-[10px] text-slate-500">Auto-read &amp; organized</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Bot className="w-5 h-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#012456]">AI Financial Chat</p>
                  <p className="text-[10px] text-slate-500">Instant plain answers</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <ShieldCheck className="w-5 h-5 text-amber-500 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#012456]">Private &amp; Secure</p>
                  <p className="text-[10px] text-slate-500">Your data stays yours</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <LayoutDashboard className="w-5 h-5 text-[#5391FE] shrink-0" />
                <div>
                  <p className="text-xs font-bold text-[#012456]">Live Dashboard</p>
                  <p className="text-[10px] text-slate-500">KPIs &amp; spending trends</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <PWADownloadModal
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
        isIOS={isIOS}
      />
    </>
  );
};

export default HeroSection;
