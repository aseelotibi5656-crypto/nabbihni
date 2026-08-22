import Link from 'next/link';
import { cn } from '@/lib/utils';

/** شعار نَبّهني — جرس داخل مربع متدرّج، يُستخدم في كل مكان */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
        'bg-gradient-to-br from-brand to-accent text-white shadow-sm shadow-brand/30',
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[18px] w-[18px]">
        <path
          d="M12 3a5.5 5.5 0 0 0-5.5 5.5c0 3.2-.7 5-1.5 6.1-.5.7 0 1.7.9 1.7h12.2c.9 0 1.4-1 .9-1.7-.8-1.1-1.5-2.9-1.5-6.1A5.5 5.5 0 0 0 12 3Z"
          fill="currentColor"
        />
        <path
          d="M10 19a2 2 0 1 0 4 0"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

export function Logo({
  href = '/',
  className,
  showText = true,
}: {
  href?: string;
  className?: string;
  showText?: boolean;
}) {
  return (
    <Link href={href} className={cn('group flex items-center gap-2.5', className)}>
      <LogoMark className="transition-transform duration-200 group-hover:scale-105" />
      {showText && <span className="text-lg font-extrabold tracking-tight">نَبّهني</span>}
    </Link>
  );
}
