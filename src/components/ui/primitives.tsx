'use client';

import { forwardRef, useId, useState } from 'react';
import { AlertCircle, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ------------------------------- حقل نصي ------------------------------- */

interface FieldProps {
  label?: string;
  error?: string | null;
  hint?: string;
  required?: boolean;
}

export const Input = forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & FieldProps
>(function Input({ label, error, hint, className, required, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="label">
          {label} {required && <span className="text-danger">*</span>}
        </label>
      )}
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined}
        className={cn('field', error && 'field-error', className)}
        {...props}
      />
      {hint && !error && (
        <p id={`${fieldId}-hint`} className="hint">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${fieldId}-error`} className="error-text" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & FieldProps
>(function Textarea({ label, error, hint, className, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="label">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        className={cn('field min-h-[92px] resize-y leading-relaxed', error && 'field-error', className)}
        {...props}
      />
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
});

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement> & FieldProps
>(function Select({ label, error, hint, className, children, id, ...props }, ref) {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={fieldId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={fieldId}
          className={cn('field appearance-none pl-9', error && 'field-error', className)}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
      </div>
      {hint && !error && <p className="hint">{hint}</p>}
      {error && (
        <p className="error-text" role="alert">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
});

/* ------------------------------- مفتاح تبديل ------------------------------- */

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <div className="min-w-0">
        <p className="text-[15px] font-medium">{label}</p>
        {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors duration-200 disabled:opacity-50',
          checked ? 'bg-brand' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200',
            checked ? 'right-0.5' : 'right-[22px]',
          )}
        />
      </button>
    </div>
  );
}

/* ------------------------------- مربع اختيار ------------------------------- */

export function Checkbox({
  checked,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <label className={cn('inline-flex cursor-pointer select-none items-center gap-2.5', className)}>
      <span
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded-md border transition-all',
          checked ? 'border-brand bg-brand text-brand-fg' : 'border-line bg-surface',
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
      </span>
      <input
        type="checkbox"
        className="sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {label && <span className="text-sm">{label}</span>}
    </label>
  );
}

/* --------------------------------- شارات --------------------------------- */

export function Badge({
  children,
  className,
  dot,
}: {
  children: React.ReactNode;
  className?: string;
  dot?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  );
}

/* ------------------------------ حالة فارغة ------------------------------ */

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center px-6 text-center',
        compact ? 'py-10' : 'py-16',
      )}
    >
      <div className="relative mb-5">
        <div className="absolute inset-0 animate-pulse-ring rounded-full bg-brand/15" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-brand/10 text-brand">
          {icon}
        </div>
      </div>
      <h3 className="text-base font-bold sm:text-lg">{title}</h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* -------------------------------- تبويبات -------------------------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-elevated p-1', className)}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition-all',
            value === tab.value
              ? 'bg-surface text-fg shadow-soft'
              : 'text-muted hover:text-fg',
          )}
        >
          {tab.label}
          {tab.count !== undefined && tab.count > 0 && (
            <span
              className={cn(
                'num rounded-full px-1.5 py-0.5 text-[10px] font-bold',
                value === tab.value ? 'bg-brand/12 text-brand' : 'bg-fg/8 text-muted',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------ شريط التقدّم ------------------------------ */

export function Progress({
  value,
  className,
  barClassName,
  label,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-line', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn('h-full rounded-full bg-brand transition-[width] duration-500 ease-out', barClassName)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* -------------------------------- قائمة منسدلة -------------------------------- */

export function Dropdown({
  trigger,
  children,
  align = 'end',
  className,
}: {
  trigger: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  align?: 'start' | 'end';
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            className={cn(
              'absolute z-50 mt-2 min-w-[200px] animate-scale-in overflow-hidden rounded-2xl border border-line bg-elevated p-1.5 shadow-lift',
              align === 'end' ? 'left-0' : 'right-0',
              className,
            )}
          >
            {children(() => setOpen(false))}
          </div>
        </>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  danger?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-right text-sm font-medium transition-colors',
        danger ? 'text-danger hover:bg-danger/10' : 'hover:bg-fg/5',
      )}
    >
      {icon}
      {children}
    </button>
  );
}

/* -------------------------------- هيكل تحميل -------------------------------- */

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4">
          <div className="skeleton h-5 w-5 rounded-md" />
          <div className="flex-1 space-y-2">
            <div className="skeleton h-3.5 w-1/3" />
            <div className="skeleton h-3 w-1/4" />
          </div>
        </div>
      ))}
    </div>
  );
}
