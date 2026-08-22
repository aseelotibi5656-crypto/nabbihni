'use client';

import { forwardRef } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'success' | 'subtle';
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-brand-fg hover:bg-brand-strong shadow-sm shadow-brand/25 active:scale-[.98]',
  secondary: 'bg-elevated text-fg border border-line hover:bg-brand/5 hover:border-brand/30',
  ghost: 'text-muted hover:bg-fg/5 hover:text-fg',
  outline: 'border border-line text-fg hover:border-brand/40 hover:bg-brand/5',
  danger: 'bg-danger text-white hover:brightness-95 active:scale-[.98]',
  success: 'bg-success text-white hover:brightness-95 active:scale-[.98]',
  subtle: 'bg-brand/10 text-brand hover:bg-brand/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5 rounded-lg',
  md: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
  lg: 'h-13 px-7 text-base gap-2.5 rounded-xl py-3.5',
  icon: 'h-11 w-11 rounded-xl',
  'icon-sm': 'h-9 w-9 rounded-lg',
};

const base =
  'inline-flex select-none items-center justify-center font-semibold transition-all duration-150 ' +
  'disabled:pointer-events-none disabled:opacity-50 whitespace-nowrap';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, icon, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  );
});

export function ButtonLink({
  className,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  href,
  ...props
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size; icon?: React.ReactNode }) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {icon}
      {children}
    </Link>
  );
}
