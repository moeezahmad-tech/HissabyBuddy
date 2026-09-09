import React from 'react';
import { X, Share, PlusSquare, Smartphone, CheckCircle2, ArrowRight, Download } from 'lucide-react';

interface PWADownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isIOS?: boolean;
}

export const PWADownloadModal: React.FC<PWADownloadModalProps> = ({ isOpen, onClose, isIOS }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 shadow-sm p-2 mx-auto flex items-center justify-center mb-3">
            <img
              src="/logo.png"
              alt="Hissaby Buddy"
              className="w-full h-full object-contain"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
          <h3 className="text-xl font-black text-[#012456] tracking-tight">
            Install Hissaby Buddy App
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Install on your phone or desktop for instant 1-tap access and native mobile experience.
          </p>
        </div>

        {/* Instructions */}
        {isIOS ? (
          <div className="space-y-4 mb-6">
            <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5 bg-blue-50/80 p-2.5 rounded-xl border border-blue-100">
              <Smartphone className="w-4 h-4 text-[#5391FE] shrink-0" />
              <span>Follow these 2 simple steps in Safari:</span>
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-[#5391FE] shrink-0">
                  <Share className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">1. Tap the Share button</span>
                  <span className="text-slate-500 text-[11px]">Located at the bottom navigation bar of Safari.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-emerald-600 shrink-0">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">2. Select &apos;Add to Home Screen&apos;</span>
                  <span className="text-slate-500 text-[11px]">Scroll down in the share sheet and tap &quot;Add to Home Screen&quot;.</span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-8 h-8 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-center text-indigo-600 shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">3. Tap &apos;Add&apos; in Top-Right</span>
                  <span className="text-slate-500 text-[11px]">The app icon will now appear on your iPhone/iPad home screen!</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-2">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Download className="w-4 h-4 text-[#5391FE]" />
                <span>To install from your browser:</span>
              </div>
              <ul className="space-y-1.5 text-slate-600 pl-6 list-disc text-[11px]">
                <li>Click the <strong>Install icon</strong> in your browser&apos;s address bar (top right).</li>
                <li>Or open your browser menu (<strong>⋮</strong> or <strong>…</strong>) and click <strong>&quot;Install Hissaby Buddy&quot;</strong>.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Benefits */}
        <div className="grid grid-cols-3 gap-2 text-center py-3 border-t border-slate-100 mb-5">
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-sm">⚡</span>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">Instant Launch</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-sm">📱</span>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">Native Feel</p>
          </div>
          <div className="p-2 bg-slate-50 rounded-xl">
            <span className="text-sm">🔒</span>
            <p className="text-[10px] font-bold text-slate-700 mt-0.5">Zero Lag</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 px-4 rounded-2xl bg-[#012456] hover:bg-[#023173] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
        >
          <span>Got it, Thanks!</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PWADownloadModal;
