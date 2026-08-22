import Link from 'next/link';
import { Compass } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';
import { CreditLine } from '@/components/marketing/footer';

export const metadata = { title: 'الصفحة غير موجودة' };

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12" />
      <p className="num mt-8 text-6xl font-extrabold text-brand">404</p>
      <div className="mt-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
        <Compass className="h-6 w-6" />
      </div>
      <h1 className="mt-5 text-2xl font-extrabold">لم نجد هذه الصفحة</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-loose text-muted">
        ربما تغيّر الرابط أو حُذفت الصفحة. لنعُد إلى مكان مألوف.
      </p>
      <div className="mt-7 flex gap-2">
        <Link href="/dashboard" className="inline-flex h-11 items-center rounded-xl bg-brand px-6 font-semibold text-brand-fg">
          لوحة التحكم
        </Link>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-line px-6 font-semibold">
          الصفحة الرئيسية
        </Link>
      </div>
      <CreditLine className="mt-10" />
    </div>
  );
}
