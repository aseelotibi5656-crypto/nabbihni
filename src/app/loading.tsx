import { LogoMark } from '@/components/marketing/logo';

export default function Loading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <LogoMark className="h-12 w-12 animate-pulse" />
      <p className="text-sm text-muted">جارٍ التحميل…</p>
    </div>
  );
}
