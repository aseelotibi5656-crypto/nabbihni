import Link from 'next/link';
import {
  ArrowLeft, Bell, CalendarDays, Sparkles, Repeat, BarChart3, Target, Search,
  Shield, Smartphone, Zap, CheckCircle2, Clock, ListChecks, Layers, MessageSquareText,
  GraduationCap, Briefcase, HeartPulse, Wallet, Flame, PlugZap,
} from 'lucide-react';
import { Navbar } from '@/components/marketing/navbar';
import { SiteFooter } from '@/components/marketing/footer';
import { DashboardMockup } from '@/components/marketing/dashboard-mockup';
import { Faq } from '@/components/marketing/faq';
import { getCurrentUser } from '@/server/auth/current-user';
import { APP_DESCRIPTION, APP_TAGLINE, PLANS } from '@/lib/constants';

export const dynamic = 'force-dynamic';

const features = [
  {
    icon: ListChecks,
    title: 'مهام تفهمك',
    body: 'أولويات، تصنيفات، مدة، ملاحظات ومرفقات — كل ما تحتاجه لتصف مهمتك مرة واحدة وتنساها بأمان.',
  },
  {
    icon: Bell,
    title: 'تذكيرات لا تُنسى',
    body: 'أضف أكثر من تذكير للمهمة الواحدة: قبل يوم، ثم قبل ساعة، ثم قبل عشر دقائق.',
  },
  {
    icon: Repeat,
    title: 'تكرار مرن',
    body: 'يوميًا، أو كل أحد وثلاثاء وخميس، أو كل أسبوعين، أو كل شهر — كما يناسب حياتك تمامًا.',
  },
  {
    icon: CalendarDays,
    title: 'تقويم متكامل',
    body: 'عرض يومي وأسبوعي وشهري وسنوي يجمع المهام والمواعيد والعادات في مكان واحد.',
  },
  {
    icon: Target,
    title: 'عادات تبني نفسها',
    body: 'تابع سلسلتك اليومية ونسبة التزامك، وشاهد تقدّمك يتراكم يومًا بعد يوم.',
  },
  {
    icon: Sparkles,
    title: 'مساعد ذكي بالعربية',
    body: 'اكتب «ذكرني أذاكر الخميس ٧ مساءً» وسيحوّلها إلى مهمة كاملة بتاريخها وتذكيرها.',
  },
  {
    icon: BarChart3,
    title: 'إحصائيات تكشف عاداتك',
    body: 'اعرف أكثر أيامك إنتاجية، ونسبة إنجازك، وأين يذهب وقتك فعليًا.',
  },
  {
    icon: Search,
    title: 'بحث وفلاتر فورية',
    body: 'ابحث في كل شيء وفلتِر بالتاريخ والأولوية والتصنيف والحالة في نفس اللحظة.',
  },
  {
    icon: Smartphone,
    title: 'يعمل كتطبيق',
    body: 'ثبّته على جوالك بضغطة واحدة وستصلك الإشعارات حتى وهو مغلق.',
  },
];

const steps = [
  {
    n: '١',
    title: 'أضف ما لا تريد نسيانه',
    body: 'مهمة، موعد، أو عادة — بضغطة واحدة أو بجملة واحدة تكتبها للمساعد الذكي.',
    icon: Zap,
  },
  {
    n: '٢',
    title: 'حدّد متى تريد التذكير',
    body: 'اختر وقتًا واحدًا أو عدة تذكيرات متتابعة، واترك الباقي علينا.',
    icon: Clock,
  },
  {
    n: '٣',
    title: 'نبّهك في الوقت المناسب',
    body: 'يصلك إشعار واضح في وقته، وإن فاتك اقترحنا عليك وقتًا جديدًا مناسبًا.',
    icon: Bell,
  },
];

const usecases = [
  {
    icon: GraduationCap,
    tint: 'text-indigo-500 bg-indigo-500/10',
    title: 'للطلاب',
    lines: ['مراجعة المحاضرات كل أحد وثلاثاء وخميس ٧ م', 'تسليم الواجب قبل الخميس', 'تذكير قبل الاختبار بيوم'],
  },
  {
    icon: Briefcase,
    tint: 'text-blue-500 bg-blue-500/10',
    title: 'للعمل',
    lines: ['اجتماع الفريق غدًا ١٠ ص', 'إرسال التقرير الأسبوعي', 'متابعة العميل بعد ٣ أيام'],
  },
  {
    icon: HeartPulse,
    tint: 'text-emerald-500 bg-emerald-500/10',
    title: 'للصحة',
    lines: ['الرياضة الثلاثاء والخميس', 'شرب ٨ أكواب ماء يوميًا', 'النوم مبكرًا قبل ١١ م'],
  },
  {
    icon: Wallet,
    tint: 'text-amber-500 bg-amber-500/10',
    title: 'للمالية',
    lines: ['دفع الفاتورة ١٥ أغسطس', 'مراجعة المصاريف شهريًا', 'تجديد الاشتراك سنويًا'],
  },
];

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-bg">
      <Navbar loggedIn={Boolean(user)} />

      {/* ================================ Hero ================================ */}
      <section className="mesh relative overflow-hidden pt-16">
        <div className="grid-pattern absolute inset-0 -z-10" aria-hidden />
        <div className="container-app relative py-16 sm:py-20 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
            <div className="animate-fade-up text-center lg:text-right">
              <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/8 px-3.5 py-1.5 text-xs font-semibold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                مساعدك الشخصي لتنظيم يومك
              </span>

              <h1 className="mt-6 text-balance text-4xl font-extrabold leading-[1.15] tracking-tight sm:text-5xl lg:text-[3.5rem]">
                {APP_TAGLINE}
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-pretty text-base leading-loose text-muted sm:text-lg lg:mx-0">
                {APP_DESCRIPTION}
              </p>

              <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href={user ? '/dashboard' : '/register'}
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3.5 text-base font-bold text-brand-fg shadow-glow transition-all hover:bg-brand-strong active:scale-[.98]"
                >
                  {user ? 'افتح لوحة التحكم' : 'ابدأ مجانًا'}
                  <ArrowLeft className="h-4.5 w-4.5" />
                </Link>
                <a
                  href="#features"
                  className="inline-flex h-13 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-7 py-3.5 text-base font-bold transition-all hover:border-brand/40 hover:bg-brand/5"
                >
                  اكتشف المميزات
                </a>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-muted lg:justify-start">
                {['بلا بطاقة بنكية', 'عربي بالكامل', 'يعمل على الجوال'].map((item) => (
                  <span key={item} className="inline-flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-success" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            <div className="animate-fade-up [animation-delay:120ms]">
              <DashboardMockup />
            </div>
          </div>
        </div>
      </section>

      {/* ============================== المميزات ============================== */}
      <section id="features" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading
            eyebrow="المميزات"
            title="كل ما تحتاجه لتنظيم حياتك في مكان واحد"
            body="ليست قائمة مهام أخرى — بل نظام متكامل يذكّرك، ويتابع عاداتك، ويريك أين يذهب وقتك."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="card card-hover group p-6"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-fg">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{feature.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= كيف تعمل ============================= */}
      <section id="how" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading eyebrow="كيف تعمل" title="ثلاث خطوات، ولن تنسى شيئًا" />

          <div className="relative mt-14 grid gap-6 md:grid-cols-3">
            <div
              className="absolute inset-x-0 top-9 hidden h-px bg-gradient-to-l from-transparent via-line to-transparent md:block"
              aria-hidden
            />
            {steps.map((step) => (
              <div key={step.n} className="relative text-center">
                <div className="mx-auto mb-5 flex h-[72px] w-[72px] items-center justify-center rounded-2xl border border-line bg-bg shadow-soft">
                  <step.icon className="h-7 w-7 text-brand" />
                </div>
                <span className="mb-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-brand/12 text-xs font-extrabold text-brand">
                  {step.n}
                </span>
                <h3 className="text-base font-bold">{step.title}</h3>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ أمثلة الاستخدام ============================ */}
      <section id="usecases" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading
            eyebrow="أمثلة"
            title="يناسب يومك أيًا كان"
            body="سواء كنت طالبًا أو موظفًا أو تبني عادة جديدة — نَبّهني يتشكّل حسب حياتك."
          />

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {usecases.map((usecase) => (
              <div key={usecase.title} className="card card-hover p-6">
                <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-xl ${usecase.tint}`}>
                  <usecase.icon className="h-5 w-5" />
                </div>
                <h3 className="text-[15px] font-bold">{usecase.title}</h3>
                <ul className="mt-3 space-y-2">
                  {usecase.lines.map((line) => (
                    <li key={line} className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand/50" />
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== التذكيرات ============================== */}
      <section id="reminders" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-24">
        <div className="container-app grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="right"
              eyebrow="التذكيرات"
              title="تذكير ذكي على مراحل، لا تنبيه واحد يضيع"
              body="لديك موعد الساعة ٨ مساءً؟ نذكّرك قبل يوم لتستعد، ثم قبل ساعة لتترك ما بيدك، ثم قبل عشر دقائق لتتحرك. وأنت من يقرر."
            />
            <ul className="mt-8 space-y-3.5">
              {[
                'أكثر من تذكير للمهمة الواحدة',
                'أوقات جاهزة أو وقت مخصص بالدقيقة',
                'إشعارات المتصفح وإشعارات الويب الدافعة',
                'ساعات هدوء تحترم نومك',
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-success/12 text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[15px] text-muted">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-3">
            {[
              { label: 'قبل يوم', text: 'تذكير مبكّر لتستعد', tone: 'bg-sky-500' },
              { label: 'قبل ساعة', text: 'تنبيه للتحضير', tone: 'bg-amber-500' },
              { label: 'قبل ١٠ دقائق', text: 'حان وقت التحرك', tone: 'bg-rose-500' },
            ].map((row, index) => (
              <div
                key={row.label}
                className="flex items-center gap-4 rounded-2xl border border-line bg-bg p-4 shadow-soft"
                style={{ marginInlineStart: `${index * 16}px` }}
              >
                <span className={`h-10 w-1.5 shrink-0 rounded-full ${row.tone}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">مراجعة الفصل الثالث</p>
                  <p className="text-xs text-muted">{row.text}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-fg/5 px-2.5 py-1 text-[11px] font-bold text-muted">
                  {row.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =============================== التقويم =============================== */}
      <section className="border-t border-line py-20 sm:py-24">
        <div className="container-app grid items-center gap-14 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <div className="card overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-sm font-bold">أغسطس ٢٠٢٦</p>
                <div className="flex gap-1">
                  {['يوم', 'أسبوع', 'شهر', 'سنة'].map((view, i) => (
                    <span
                      key={view}
                      className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold ${
                        i === 2 ? 'bg-brand text-brand-fg' : 'bg-fg/5 text-muted'
                      }`}
                    >
                      {view}
                    </span>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-7 gap-1.5 text-center">
                {['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'].map((d) => (
                  <div key={d} className="pb-1 text-[10px] font-bold text-faint">
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }).map((_, i) => {
                  const day = i - 5;
                  const active = day > 0 && day <= 31;
                  const busy = [3, 7, 10, 14, 15, 18, 22, 25, 28].includes(day);
                  const today = day === 10;
                  return (
                    <div
                      key={i}
                      className={`aspect-square rounded-lg border p-1 text-[10px] ${
                        today
                          ? 'border-brand bg-brand/10 font-extrabold text-brand'
                          : active
                            ? 'border-line'
                            : 'border-transparent text-faint/40'
                      }`}
                    >
                      <span className="num">{active ? day : ''}</span>
                      {busy && active && (
                        <div className="mt-0.5 flex justify-center gap-0.5">
                          <span className="h-1 w-1 rounded-full bg-indigo-500" />
                          <span className="h-1 w-1 rounded-full bg-emerald-500" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <SectionHeading
              align="right"
              eyebrow="التقويم"
              title="شهرك كله أمام عينيك"
              body="انتقل بين العرض اليومي والأسبوعي والشهري والسنوي، واضغط أي عنصر لتفتحه أو تعدّله فورًا. المهام والمواعيد والعادات كلها في تقويم واحد."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {['مهام', 'مواعيد', 'تذكيرات', 'عادات'].map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-muted"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =============================== العادات =============================== */}
      <section id="habits" className="scroll-mt-20 border-t border-line bg-surface py-20 sm:py-24">
        <div className="container-app grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="right"
              eyebrow="العادات"
              title="اِبنِ عادة، وشاهد سلسلتك تكبر"
              body="القراءة، الرياضة، شرب الماء، المذاكرة، النوم مبكرًا — حدّد التكرار والوقت والهدف، وتابع التزامك يومًا بيوم."
            />
            <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'السلسلة الحالية', value: '١٢', icon: Flame, tint: 'text-orange-500' },
                { label: 'أطول سلسلة', value: '٣١', icon: Target, tint: 'text-violet-500' },
                { label: 'نسبة الالتزام', value: '٨٦٪', icon: BarChart3, tint: 'text-emerald-500' },
                { label: 'عادات نشطة', value: '٥', icon: Layers, tint: 'text-brand' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-line bg-bg p-4">
                  <stat.icon className={`mb-2 h-4 w-4 ${stat.tint}`} />
                  <p className="text-xl font-extrabold">{stat.value}</p>
                  <p className="mt-0.5 text-[11px] leading-tight text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {[
              { title: 'قراءة ٢٠ صفحة', color: 'bg-violet-500', days: [1, 1, 1, 0, 1, 1, 1] },
              { title: 'ممارسة الرياضة', color: 'bg-emerald-500', days: [0, 1, 0, 1, 0, 1, 1] },
              { title: 'شرب ٨ أكواب ماء', color: 'bg-sky-500', days: [1, 1, 1, 1, 1, 0, 1] },
            ].map((habit) => (
              <div key={habit.title} className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`h-8 w-1.5 rounded-full ${habit.color}`} />
                    <p className="text-sm font-bold">{habit.title}</p>
                  </div>
                  <span className="num flex items-center gap-1 text-xs font-bold text-orange-500">
                    <Flame className="h-3.5 w-3.5" />
                    {habit.days.filter(Boolean).length}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  {habit.days.map((done, i) => (
                    <div
                      key={i}
                      className={`h-7 flex-1 rounded-lg ${done ? habit.color : 'bg-line'}`}
                      title={done ? 'أُنجزت' : 'لم تُنجز'}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================= المساعد الذكي ============================= */}
      <section id="ai" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading
            eyebrow="المساعد الذكي"
            title="اكتب بلغتك، ونحن نتكفّل بالباقي"
            body="لا حقول ولا خطوات — جملة واحدة تتحوّل إلى مهمة كاملة، وتُعرض عليك قبل الحفظ."
          />

          <div className="mx-auto mt-14 grid max-w-4xl gap-4 md:grid-cols-2">
            <div className="card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-muted">
                <MessageSquareText className="h-4 w-4" />
                ما تكتبه أنت
              </div>
              <div className="rounded-2xl bg-brand/8 p-4 text-[15px] leading-loose">
                «ذكرني أذاكر الفصل الثالث يوم الخميس الساعة ٧ مساءً»
              </div>
              <p className="mt-4 text-xs leading-relaxed text-muted">
                وإذا كان طلبك ناقصًا، يسألك المساعد عن المعلومة المفقودة بدل أن ينشئ مهمة خاطئة.
              </p>
            </div>

            <div className="card border-brand/25 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold text-brand">
                <Sparkles className="h-4 w-4" />
                ما ينشئه المساعد
              </div>
              <dl className="space-y-2.5 text-sm">
                {[
                  ['المهمة', 'مذاكرة الفصل الثالث'],
                  ['التاريخ', 'الخميس'],
                  ['الوقت', '٧:٠٠ مساءً'],
                  ['التذكير', 'قبل ١٠ دقائق'],
                  ['التصنيف', 'الدراسة'],
                ].map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between gap-3 border-b border-line pb-2.5 last:border-0">
                    <dt className="text-muted">{key}</dt>
                    <dd className="font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-4 flex gap-2">
                <span className="flex-1 rounded-xl bg-brand py-2 text-center text-sm font-bold text-brand-fg">
                  إنشاء
                </span>
                <span className="flex-1 rounded-xl border border-line py-2 text-center text-sm font-bold">
                  تعديل
                </span>
              </div>
            </div>
          </div>

          <p className="mt-8 text-center text-xs text-muted">
            يعمل المساعد افتراضيًا بمحلّل عربي داخلي بلا أي مفاتيح، ويمكن ربطه بمزوّد نماذج لغوية
            من الإعدادات لاحقًا.
          </p>
        </div>
      </section>

      {/* ============================== الإحصائيات ============================== */}
      <section className="border-t border-line bg-surface py-20 sm:py-24">
        <div className="container-app grid items-center gap-14 lg:grid-cols-2">
          <div>
            <SectionHeading
              align="right"
              eyebrow="الإحصائيات"
              title="اعرف أين يذهب وقتك فعلًا"
              body="عدد المهام المنجزة والمتأخرة، نسبة الإنجاز، أكثر أيامك إنتاجية، وساعات تركيزك — كلها بأرقام واضحة لا تحتاج تفسيرًا."
            />
          </div>

          <div className="card p-6">
            <p className="mb-5 text-xs font-bold text-muted">المهام المنجزة — آخر ٧ أيام</p>
            <div className="flex items-end gap-2.5">
              {[
                { d: 'أحد', v: 55 },
                { d: 'اثنين', v: 80 },
                { d: 'ثلاثاء', v: 45 },
                { d: 'أربعاء', v: 95 },
                { d: 'خميس', v: 70 },
                { d: 'جمعة', v: 30 },
                { d: 'سبت', v: 60 },
              ].map((bar) => (
                <div key={bar.d} className="flex flex-1 flex-col items-center gap-2">
                  {/* ارتفاع بالبكسل: النسب المئوية تحتاج ارتفاعًا محدَّدًا للأب */}
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-brand/70 to-brand"
                    style={{ height: `${Math.round((bar.v / 100) * 150)}px` }}
                  />
                  <span className="text-[10px] text-faint">{bar.d}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 border-t border-line pt-5">
              {[
                { label: 'منجزة', value: '٤٣' },
                { label: 'نسبة الإنجاز', value: '٨١٪' },
                { label: 'ساعات التركيز', value: '١٢' },
              ].map((stat) => (
                <div key={stat.label}>
                  <p className="text-lg font-extrabold">{stat.value}</p>
                  <p className="text-[11px] text-muted">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================================ الخطط ================================ */}
      <section className="border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading
            eyebrow="الخطط"
            title="ابدأ مجانًا، وترقَّ عندما تحتاج"
            body="الخطة المجانية كافية تمامًا لتنظيم يومك. الخطط الأعلى للفرق ولمن يريد المزيد."
          />

          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {PLANS.map((plan) => (
              <div
                key={plan.id}
                className={`card relative p-7 ${
                  plan.highlighted ? 'border-brand/40 shadow-glow lg:-translate-y-3' : ''
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 right-7 rounded-full bg-brand px-3 py-1 text-[11px] font-bold text-brand-fg">
                    الأكثر اختيارًا
                  </span>
                )}
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="mt-1 text-sm text-muted">{plan.description}</p>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">{plan.price}</span>
                  <span className="text-sm text-muted">{plan.period}</span>
                </div>
                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.id === 'free' ? '/register' : '/register?plan=' + plan.id}
                  className={`mt-7 flex h-11 items-center justify-center rounded-xl text-sm font-bold transition-all ${
                    plan.highlighted
                      ? 'bg-brand text-brand-fg hover:bg-brand-strong'
                      : 'border border-line hover:border-brand/40 hover:bg-brand/5'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="mt-6 text-center text-xs text-muted">
            بنية الدفع جاهزة للربط بمزوّد اشتراكات لاحقًا — لا حاجة لبطاقة بنكية الآن.
          </p>
        </div>
      </section>

      {/* ============================= الأمان والجودة ============================= */}
      <section className="border-t border-line bg-surface py-20 sm:py-24">
        <div className="container-app">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Shield, title: 'أمان من الأساس', body: 'كلمات مرور مجزّأة، جلسات قابلة للإبطال، وعزل تام لبيانات كل مستخدم.' },
              { icon: Smartphone, title: 'جوال أولًا', body: 'تصميم يبدأ من الشاشة الصغيرة، وقابل للتثبيت كتطبيق مستقل.' },
              { icon: Zap, title: 'سريع ومباشر', body: 'تحميل كسول وتقسيم للكود واستعلامات مفهرسة — بلا انتظار.' },
              { icon: PlugZap, title: 'جاهز للتوسّع', body: 'طبقات منفصلة للإشعارات والذكاء الاصطناعي والبريد، قابلة للاستبدال.' },
            ].map((item) => (
              <div key={item.title} className="rounded-2xl border border-line bg-bg p-6">
                <item.icon className="mb-3.5 h-5 w-5 text-brand" />
                <h3 className="text-[15px] font-bold">{item.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================================ الأسئلة ================================ */}
      <section id="faq" className="scroll-mt-20 border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <SectionHeading eyebrow="الأسئلة الشائعة" title="أسئلة يسألها الجميع" />
          <div className="mt-14">
            <Faq />
          </div>
        </div>
      </section>

      {/* ================================= CTA ================================= */}
      <section className="border-t border-line py-20 sm:py-24">
        <div className="container-app">
          <div className="mesh relative overflow-hidden rounded-[2rem] border border-line px-6 py-16 text-center sm:px-12">
            <h2 className="text-balance text-3xl font-extrabold sm:text-4xl">
              ابدأ اليوم، ولا تنسَ شيئًا بعد الآن.
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-loose text-muted">
              أنشئ حسابك في أقل من دقيقة، وأضف أول مهمة الآن. مجانًا وبلا بطاقة بنكية.
            </p>
            <Link
              href={user ? '/dashboard' : '/register'}
              className="mt-8 inline-flex h-13 items-center gap-2 rounded-xl bg-brand px-8 py-3.5 text-base font-bold text-brand-fg shadow-glow transition-all hover:bg-brand-strong active:scale-[.98]"
            >
              {user ? 'افتح لوحة التحكم' : 'ابدأ مجانًا'}
              <ArrowLeft className="h-4.5 w-4.5" />
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  body,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  body?: string;
  align?: 'center' | 'right';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-2xl text-center' : 'text-right'}>
      <span className="text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</span>
      <h2 className="mt-3 text-balance text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
      {body && <p className="mt-4 text-pretty text-[15px] leading-loose text-muted sm:text-base">{body}</p>}
    </div>
  );
}
