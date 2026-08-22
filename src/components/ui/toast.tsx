'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * نظام التنبيهات المنبثقة (Toasts).
 * يُستخدم في كل التطبيق لتأكيد العمليات وعرض الأخطاء وإظهار التذكيرات.
 */

type ToastKind = 'success' | 'error' | 'info' | 'reminder';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => string;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast يجب أن يُستخدم داخل ToastProvider');
  return ctx;
}

const styles: Record<ToastKind, { icon: React.ReactNode; ring: string }> = {
  success: { icon: <CheckCircle2 className="h-5 w-5 text-success" />, ring: 'ring-success/25' },
  error: { icon: <AlertCircle className="h-5 w-5 text-danger" />, ring: 'ring-danger/25' },
  info: { icon: <Info className="h-5 w-5 text-info" />, ring: 'ring-info/25' },
  reminder: { icon: <Bell className="h-5 w-5 text-brand" />, ring: 'ring-brand/25' },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (input: Omit<Toast, 'id'>) => {
      const id = Math.random().toString(36).slice(2);
      const duration = input.duration ?? (input.kind === 'reminder' ? 12_000 : 4500);
      setToasts((prev) => [...prev.slice(-3), { ...input, id }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toast,
      dismiss,
      success: (title, description) => void toast({ kind: 'success', title, description }),
      error: (title, description) => void toast({ kind: 'error', title, description }),
      info: (title, description) => void toast({ kind: 'info', title, description }),
    }),
    [toast, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[100] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:top-0 sm:items-start"
        role="region"
        aria-live="polite"
        aria-label="التنبيهات"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-md animate-slide-in-bottom items-start gap-3 rounded-2xl',
              'border border-line bg-elevated p-4 shadow-lift ring-1',
              styles[t.kind].ring,
            )}
          >
            <div className="mt-0.5 shrink-0">{styles[t.kind].icon}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-snug">{t.title}</p>
              {t.description && (
                <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{t.description}</p>
              )}
              {t.action && (
                <button
                  onClick={() => {
                    t.action!.onClick();
                    dismiss(t.id);
                  }}
                  className="mt-2 text-[13px] font-semibold text-brand hover:underline"
                >
                  {t.action.label}
                </button>
              )}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-faint transition-colors hover:bg-fg/5 hover:text-fg"
              aria-label="إغلاق التنبيه"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
