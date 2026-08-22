import Link from 'next/link';
import { Bell, CheckCircle2, Sparkles } from 'lucide-react';
import { Logo } from '@/components/marketing/logo';
import { CreditLine } from '@/components/marketing/footer';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* اللوحة الجانبية التسويقية — تختفي على الجوال لتوفير المساحة */}
      <aside className="mesh relative hidden flex-col justify-between overflow-hidden border-l border-line p-10 lg:flex">
        <div className="grid-pattern absolute inset-0 -z-10" aria-hidden />
        <Logo />

        <div className="max-w-md">
          <h2 className="text-balance text-3xl font-extrabold leading-snug">
            لا تنسَ شيئًا بعد اليوم.
          </h2>
          <p className="mt-4 text-[15px] leading-loose text-muted">
            نظّم مهامك ومواعيدك وعاداتك في مكان واحد، ودع نَبّهني يذكّرك في الوقت المناسب تمامًا.
          </p>

          <ul className="mt-8 space-y-4">
            {[
              { icon: Bell, text: 'تذكيرات متعدّدة للمهمة الواحدة' },
              { icon: Sparkles, text: 'مساعد ذكي يفهم العربية' },
              { icon: CheckCircle2, text: 'عادات وسلاسل ونِسَب التزام' },
            ].map((item) => (
              <li key={item.text} className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="text-[15px] text-muted">{item.text}</span>
              </li>
            ))}
          </ul>
        </div>

        <CreditLine />
      </aside>

      {/* منطقة النموذج */}
      <main className="flex flex-col">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Logo />
          <Link href="/" className="text-sm font-medium text-muted hover:text-fg">
            الرئيسية
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-8 sm:px-8">
          <div className="w-full max-w-md">{children}</div>
        </div>

        <div className="p-5 text-center lg:hidden">
          <CreditLine />
        </div>
      </main>
    </div>
  );
}
