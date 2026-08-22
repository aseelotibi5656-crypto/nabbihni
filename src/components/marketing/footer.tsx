import Link from 'next/link';
import { Logo } from './logo';
import { CREDIT_NAME, CREDIT_URL } from '@/lib/constants';
import { cn } from '@/lib/utils';

/**
 * سطر الاعتماد — يظهر أسفل كل صفحات الموقع.
 * الاسم يتحوّل إلى رابط تلقائياً بمجرد تعيين CREDIT_URL في constants.ts
 */
export function CreditLine({ className }: { className?: string }) {
  return (
    <p className={cn('text-[11px] text-faint', className)}>
      صُنع بواسطة{' '}
      {CREDIT_URL ? (
        <a
          href={CREDIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-muted transition-colors hover:text-brand"
        >
          {CREDIT_NAME}
        </a>
      ) : (
        <span className="font-semibold text-muted">{CREDIT_NAME}</span>
      )}
    </p>
  );
}

const columns = [
  {
    title: 'المنتج',
    links: [
      { label: 'المميزات', href: '/#features' },
      { label: 'كيف تعمل', href: '/#how' },
      { label: 'المساعد الذكي', href: '/#ai' },
      { label: 'الأسئلة الشائعة', href: '/#faq' },
    ],
  },
  {
    title: 'ابدأ',
    links: [
      { label: 'إنشاء حساب', href: '/register' },
      { label: 'تسجيل الدخول', href: '/login' },
      { label: 'لوحة التحكم', href: '/dashboard' },
    ],
  },
  {
    title: 'الاستخدامات',
    links: [
      { label: 'للطلاب', href: '/#usecases' },
      { label: 'للعمل', href: '/#usecases' },
      { label: 'للعادات', href: '/#habits' },
      { label: 'للعائلة', href: '/#usecases' },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="container-app py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              مساعدك الشخصي لتنظيم المهام والمواعيد والعادات، وتذكيرك بها في وقتها تمامًا.
            </p>
          </div>

          {columns.map((column) => (
            <div key={column.title}>
              <h3 className="mb-3.5 text-[13px] font-bold text-fg">{column.title}</h3>
              <ul className="space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted transition-colors hover:text-brand"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
          <p className="text-xs text-muted">
            © {new Date().getFullYear()} نَبّهني. جميع الحقوق محفوظة.
          </p>
          <CreditLine />
        </div>
      </div>
    </footer>
  );
}
