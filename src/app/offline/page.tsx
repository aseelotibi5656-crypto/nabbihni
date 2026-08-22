import Link from 'next/link';
import { WifiOff } from 'lucide-react';
import { LogoMark } from '@/components/marketing/logo';
import { CreditLine } from '@/components/marketing/footer';

export const metadata = { title: 'لا يوجد اتصال' };

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <LogoMark className="h-12 w-12" />
      <div className="mt-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-warning/12 text-warning">
        <WifiOff className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-extrabold">لا يوجد اتصال بالإنترنت</h1>
      <p className="mt-3 max-w-sm text-[15px] leading-loose text-muted">
        يبدو أنك غير متصل الآن. ستعود بياناتك للظهور فور عودة الاتصال — ولن تفقد أي مهمة.
      </p>
      <Link
        href="/dashboard"
        className="mt-7 inline-flex h-11 items-center rounded-xl bg-brand px-6 font-semibold text-brand-fg"
      >
        إعادة المحاولة
      </Link>
      <CreditLine className="mt-10" />
    </div>
  );
}
