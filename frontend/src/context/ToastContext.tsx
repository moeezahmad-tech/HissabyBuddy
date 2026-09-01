import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, options?: ToastOptions) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// Global fallback handler for non-React call sites
let globalToastHandler: ((type: ToastType, message: string, options?: ToastOptions) => void) | null = null;

export const toast = {
  success: (message: string, title?: string) => {
    if (globalToastHandler) globalToastHandler('success', message, { title });
    else console.log('[Toast Success]', title, message);
  },
  error: (message: string, title?: string) => {
    if (globalToastHandler) globalToastHandler('error', message, { title: title || 'Error' });
    else console.error('[Toast Error]', title, message);
  },
  warning: (message: string, title?: string) => {
    if (globalToastHandler) globalToastHandler('warning', message, { title: title || 'Warning' });
    else console.warn('[Toast Warning]', title, message);
  },
  info: (message: string, title?: string) => {
    if (globalToastHandler) globalToastHandler('info', message, { title });
    else console.info('[Toast Info]', title, message);
  },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions) => {
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const duration = options?.duration ?? (type === 'error' ? 5000 : 4000);
      const newToast: ToastItem = {
        id,
        type,
        message,
        title: options?.title,
        duration,
      };

      setToasts((prev) => [newToast, ...prev.slice(0, 4)]); // max 5 simultaneous toasts

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  // Bind global toast helper
  React.useEffect(() => {
    globalToastHandler = showToast;
    return () => {
      globalToastHandler = null;
    };
  }, [showToast]);

  const success = useCallback((msg: string, title?: string) => showToast('success', msg, { title }), [showToast]);
  const error = useCallback((msg: string, title?: string) => showToast('error', msg, { title: title || 'Action Failed' }), [showToast]);
  const warning = useCallback((msg: string, title?: string) => showToast('warning', msg, { title: title || 'Warning' }), [showToast]);
  const info = useCallback((msg: string, title?: string) => showToast('info', msg, { title }), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-md transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-3 ${
                isError
                  ? 'bg-rose-900/95 border-rose-700 text-white shadow-rose-950/40'
                  : isSuccess
                  ? 'bg-emerald-900/95 border-emerald-700 text-white shadow-emerald-950/40'
                  : isWarning
                  ? 'bg-amber-900/95 border-amber-700 text-white shadow-amber-950/40'
                  : 'bg-slate-900/95 border-slate-700 text-white shadow-slate-950/40'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {isError && <AlertCircle className="w-5 h-5 text-rose-300" />}
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-5 h-5 text-sky-300" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-bold tracking-tight mb-0.5 text-white/95">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-white/85 leading-relaxed break-words font-medium">
                  {t.message}
                </p>
              </div>

              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    // Return safe fallback using singleton
    return {
      showToast: (type: ToastType, msg: string, opts?: ToastOptions) => {
        if (type === 'error') toast.error(msg, opts?.title);
        else if (type === 'success') toast.success(msg, opts?.title);
        else if (type === 'warning') toast.warning(msg, opts?.title);
        else toast.info(msg, opts?.title);
      },
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
      removeToast: () => {},
    };
  }
  return context;
};
