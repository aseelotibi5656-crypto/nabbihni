import { Bell, Check, Flame, CalendarDays, Sparkles } from 'lucide-react';

/**
 * معاينة واقعية للوحة التحكم داخل الصفحة الرئيسية.
 * مبنيّة بـ HTML/CSS فقط (بدون صور) لتبقى حادّة على كل الشاشات وخفيفة الحجم.
 */
export function DashboardMockup() {
  const items = [
    { time: '08:00', title: 'محاضرة أنظمة قواعد البيانات', color: 'bg-indigo-500', done: true },
    { time: '01:00', title: 'اجتماع الفريق الأسبوعي', color: 'bg-blue-500', done: true },
    { time: '05:00', title: 'ممارسة الرياضة', color: 'bg-emerald-500', done: false },
    { time: '07:00', title: 'مراجعة الفصل الثالث', color: 'bg-violet-500', done: false, soon: true },
  ];

  return (
    <div className="relative" dir="rtl">
      {/* توهّج خلفي */}
      <div className="absolute -inset-8 -z-10 rounded-[3rem] bg-gradient-to-br from-brand/25 via-accent/15 to-transparent blur-3xl" />

      <div className="overflow-hidden rounded-3xl border border-line bg-surface shadow-lift">
        {/* شريط النافذة */}
        <div className="flex items-center gap-2 border-b border-line bg-elevated px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          <div className="mx-auto rounded-md bg-surface px-3 py-1 text-[10px] text-faint">
            nabbihni.app/dashboard
          </div>
        </div>

        <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-[1fr_auto]">
          <div className="space-y-4">
            <div>
              <p className="text-[15px] font-bold sm:text-lg">صباح الخير، أصيل 👋</p>
              <p className="text-xs text-muted">لديك ٤ عناصر اليوم — أنجزت اثنين منها.</p>
            </div>

            {/* بطاقات الملخص */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'مهام اليوم', value: '٤', tint: 'text-brand' },
                { label: 'مكتملة', value: '٢', tint: 'text-emerald-500' },
                { label: 'نسبة الإنجاز', value: '٥٠٪', tint: 'text-amber-500' },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-line bg-bg/60 p-2.5">
                  <p className="text-[10px] text-muted">{stat.label}</p>
                  <p className={`mt-0.5 text-lg font-extrabold ${stat.tint}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* جدول اليوم */}
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted">ماذا لديك اليوم؟</p>
              {items.map((item) => (
                <div
                  key={item.title}
                  className="flex items-center gap-2.5 rounded-xl border border-line bg-bg/40 px-3 py-2.5"
                >
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-md ${
                      item.done ? 'bg-emerald-500 text-white' : 'border border-line'
                    }`}
                  >
                    {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  <span className={`h-6 w-1 rounded-full ${item.color}`} />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[12px] font-medium ${
                        item.done ? 'text-faint line-through' : ''
                      }`}
                    >
                      {item.title}
                    </p>
                  </div>
                  {item.soon && (
                    <span className="shrink-0 rounded-md bg-brand/12 px-1.5 py-0.5 text-[9px] font-bold text-brand">
                      بعد ١٥ د
                    </span>
                  )}
                  <span className="num shrink-0 text-[10px] text-faint">{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* العمود الجانبي */}
          <div className="hidden w-44 space-y-3 md:block">
            <div className="rounded-2xl border border-line bg-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                سلسلة العادات
              </div>
              <p className="mt-1 text-2xl font-extrabold text-orange-500">١٢</p>
              <div className="mt-2 flex gap-1">
                {[1, 1, 1, 1, 0, 1, 1].map((v, i) => (
                  <span
                    key={i}
                    className={`h-5 flex-1 rounded ${v ? 'bg-orange-500/80' : 'bg-line'}`}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-line bg-bg/60 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted">
                <CalendarDays className="h-3.5 w-3.5 text-brand" />
                أقرب موعد
              </div>
              <p className="mt-1 text-[11px] font-semibold leading-snug">مراجعة الفصل الثالث</p>
              <p className="text-[10px] text-muted">اليوم ٧:٠٠ مساءً</p>
            </div>

            <div className="rounded-2xl border border-brand/25 bg-brand/8 p-3">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                المساعد الذكي
              </div>
              <p className="mt-1 text-[10px] leading-relaxed text-muted">
                «ذكرني أذاكر الفصل الثالث الخميس ٧ مساءً»
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* بطاقة إشعار عائمة */}
      <div className="absolute -bottom-5 right-2 hidden w-60 animate-float items-start gap-2.5 rounded-2xl border border-line bg-elevated p-3 shadow-lift sm:flex">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand/12 text-brand">
          <Bell className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="text-[11px] font-bold">🔔 لديك مهمة بعد ١٥ دقيقة</p>
          <p className="truncate text-[10px] text-muted">مراجعة الفصل الثالث</p>
        </div>
      </div>
    </div>
  );
}
