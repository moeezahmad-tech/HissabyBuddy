import React from 'react';
import { 
  ArrowRight, 
  UploadCloud, 
  Bot, 
  LayoutDashboard, 
  ShieldCheck
} from 'lucide-react';

interface HeroSectionProps {
  onOpenApp?: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenApp }) => {
  return (
    <section className="relative pt-12 pb-20 sm:pt-16 sm:pb-28 overflow-hidden bg-white">
      {/* Decorative gradient backdrops */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-6xl h-80 bg-gradient-to-b from-blue-50/70 via-sky-50/40 to-transparent blur-2xl -z-10 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          {/* Top Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 mb-8 hover:bg-slate-200/80 transition-colors">
            <span className="w-2 h-2 rounded-full bg-[#5391FE] animate-ping" />
            <span>Introducing Hisaaby Buddy AI Financial Copilot</span>
            <span className="text-[#5391FE] font-bold">Simple &amp; Fast &rarr;</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#012456] tracking-tight leading-[1.1] text-balance">
            Smart Financial Decisions Made Effortless with <span className="text-[#5391FE]">AI</span> &amp; <span className="underline decoration-[#5391FE] decoration-4 underline-offset-8">Instant Insights</span>
          </h1>

          {/* Subheading with user-first benefits */}
          <p className="mt-6 text-lg sm:text-xl text-slate-600 font-normal leading-relaxed text-pretty max-w-3xl mx-auto">
            Upload your bank statements, ask anything about your spending habits, and effortlessly track your income and budgets with real-time personal analytics.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            {onOpenApp && (
              <button
                onClick={onOpenApp}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#5391FE] hover:bg-[#437de0] text-white font-bold text-sm transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 flex items-center justify-center gap-2.5 cursor-pointer"
              >
                <LayoutDashboard className="w-5 h-5" />
                <span>Open Financial Dashboard</span>
              </button>
            )}
            <a
              href="#feature-document-upload"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-white hover:bg-slate-50 text-[#012456] font-bold text-sm transition-all border border-slate-300 shadow-xs hover:border-[#5391FE] flex items-center justify-center gap-2"
            >
              <span>Explore Features</span>
              <ArrowRight className="w-4 h-4 text-[#5391FE]" />
            </a>
          </div>

          {/* Trust & Spec Badges */}
          <div className="mt-12 pt-8 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
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
  );
};

export default HeroSection;
