import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, ArrowRight } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  title?: string;
  duration?: number;
  action?: ToastAction;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
  action?: ToastAction;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string, options?: ToastOptions | string) => void;
  success: (message: string, titleOrOptions?: string | ToastOptions) => void;
  error: (message: string, titleOrOptions?: string | ToastOptions) => void;
  warning: (message: string, titleOrOptions?: string | ToastOptions) => void;
  info: (message: string, titleOrOptions?: string | ToastOptions) => void;
  removeToast: (id: string) => void;
}

const normalizeOptions = (titleOrOptions?: string | ToastOptions): ToastOptions => {
  if (typeof titleOrOptions === 'string') {
    return { title: titleOrOptions };
  }
  return titleOrOptions || {};
};

const ToastContext = createContext<ToastContextValue | null>(null);

// Global fallback handler for non-React call sites
let globalToastHandler: ((type: ToastType, message: string, options?: ToastOptions) => void) | null = null;

export const toast = {
  success: (message: string, titleOrOptions?: string | ToastOptions) => {
    const opts = normalizeOptions(titleOrOptions);
    if (globalToastHandler) globalToastHandler('success', message, opts);
    else console.log('[Toast Success]', opts.title, message);
  },
  error: (message: string, titleOrOptions?: string | ToastOptions) => {
    const opts = normalizeOptions(titleOrOptions);
    if (globalToastHandler) globalToastHandler('error', message, { title: opts.title || 'Error', ...opts });
    else console.error('[Toast Error]', opts.title, message);
  },
  warning: (message: string, titleOrOptions?: string | ToastOptions) => {
    const opts = normalizeOptions(titleOrOptions);
    if (globalToastHandler) globalToastHandler('warning', message, { title: opts.title || 'Warning', ...opts });
    else console.warn('[Toast Warning]', opts.title, message);
  },
  info: (message: string, titleOrOptions?: string | ToastOptions) => {
    const opts = normalizeOptions(titleOrOptions);
    if (globalToastHandler) globalToastHandler('info', message, opts);
    else console.info('[Toast Info]', opts.title, message);
  },
};

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string, options?: ToastOptions | string) => {
      const opts = normalizeOptions(options);
      const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      const duration = opts.duration ?? (type === 'error' ? 5000 : 4000);
      const newToast: ToastItem = {
        id,
        type,
        message,
        title: opts.title,
        duration,
        action: opts.action,
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

  const success = useCallback(
    (msg: string, titleOrOptions?: string | ToastOptions) => showToast('success', msg, titleOrOptions),
    [showToast]
  );
  const error = useCallback(
    (msg: string, titleOrOptions?: string | ToastOptions) =>
      showToast('error', msg, typeof titleOrOptions === 'string' ? { title: titleOrOptions } : { title: 'Action Failed', ...titleOrOptions }),
    [showToast]
  );
  const warning = useCallback(
    (msg: string, titleOrOptions?: string | ToastOptions) =>
      showToast('warning', msg, typeof titleOrOptions === 'string' ? { title: titleOrOptions } : { title: 'Warning', ...titleOrOptions }),
    [showToast]
  );
  const info = useCallback(
    (msg: string, titleOrOptions?: string | ToastOptions) => showToast('info', msg, titleOrOptions),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, success, error, warning, info, removeToast }}>
      {children}
      {/* Custom Modern Floating Toast Notifications Container */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isError = t.type === 'error';
          const isSuccess = t.type === 'success';
          const isWarning = t.type === 'warning';

          return (
            <div
              key={t.id}
              role="alert"
              className={`pointer-events-auto relative flex items-start gap-3.5 p-4 rounded-2xl border shadow-xl backdrop-blur-xl transition-all duration-300 transform translate-y-0 opacity-100 animate-in fade-in slide-in-from-top-4 ${
                isError
                  ? 'bg-rose-950/95 border-rose-800/80 text-white shadow-rose-950/40'
                  : isSuccess
                  ? 'bg-emerald-950/95 border-emerald-800/80 text-white shadow-emerald-950/40'
                  : isWarning
                  ? 'bg-amber-950/95 border-amber-800/80 text-white shadow-amber-950/40'
                  : 'bg-slate-900/95 border-slate-700/80 text-white shadow-slate-950/40'
              }`}
            >
              {/* Colored status icon container */}
              <div
                className={`shrink-0 w-8 h-8 rounded-xl flex items-center justify-center ${
                  isError
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700/50'
                    : isSuccess
                    ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                    : isWarning
                    ? 'bg-amber-900/60 text-amber-300 border border-amber-700/50'
                    : 'bg-sky-900/60 text-sky-300 border border-sky-700/50'
                }`}
              >
                {isError && <AlertCircle className="w-4 h-4 stroke-[2.2]" />}
                {isSuccess && <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />}
                {isWarning && <AlertTriangle className="w-4 h-4 stroke-[2.2]" />}
                {!isError && !isSuccess && !isWarning && <Info className="w-4 h-4 stroke-[2.2]" />}
              </div>

              {/* Message and optional action */}
              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-bold tracking-tight mb-0.5 text-white/95">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-white/85 leading-relaxed break-words font-medium">
                  {t.message}
                </p>

                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      removeToast(t.id);
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-[11px] transition-all cursor-pointer border border-white/20 shadow-xs"
                  >
                    <span>{t.action.label}</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>

              {/* Close / Dismiss button */}
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1.5 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
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
      showToast: (type: ToastType, msg: string, opts?: ToastOptions | string) => {
        if (type === 'error') toast.error(msg, opts);
        else if (type === 'success') toast.success(msg, opts);
        else if (type === 'warning') toast.warning(msg, opts);
        else toast.info(msg, opts);
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
