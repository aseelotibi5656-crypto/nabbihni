'use client';

import { useEffect, useState } from 'react';
import {
  CheckCircle2, AlertTriangle, TrendingUp, Timer, Flame, Target, ListTodo, CalendarRange,
} from 'lucide-react';
import { ChartCard, ColumnChart, AreaChart, BarList, DonutStat, seriesVar } from './charts';
import { EmptyState, Tabs } from '@/components/ui/primitives';
import { api } from '@/lib/api-client';
import { PRIORITY_MAP } from '@/lib/constants';
import { formatKeyShort, weekdayShort } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AnalyticsPayload } from '@/lib/types';

const ranges = [
  { value: 7, label: 'أسبوع' },
  { value: 30, label: 'شهر' },
  { value: 90, label: '٣ أشهر' },
  { value: 365, label: 'سنة' },
];

export function AnalyticsView({ initial }: { initial: AnalyticsPayload }) {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (days === initial.range.days) {
      setData(initial);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.analytics
      .get(days)
      .then(({ analytics }) => {
        if (!cancelled) setData(analytics);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [days, initial]);

  const { totals } = data;
  const hasData = totals.created > 0 || totals.completed > 0 || totals.habitCompletions > 0;

  const stats = [
    { label: 'مهام منجزة', value: totals.completed, icon: CheckCircle2, tone: 'text-success bg-success/10' },
    { label: 'قيد التنفيذ', value: totals.pending, icon: ListTodo, tone: 'text-brand bg-brand/10' },
    { label: 'متأخرة', value: totals.overdue, icon: AlertTriangle, tone: totals.overdue ? 'text-danger bg-danger/10' : 'text-muted bg-fg/5' },
    { label: 'نسبة الإنجاز', value: `${totals.completionRate}٪`, icon: TrendingUp, tone: 'text-amber-500 bg-amber-500/10' },
    {
      label: 'ساعات التركيز',
      value: totals.focusMinutes ? `${(totals.focusMinutes / 60).toFixed(1)} س` : '—',
      icon: Timer,
      tone: 'text-violet-500 bg-violet-500/10',
    },
    { label: 'إنجازات العادات', value: totals.habitCompletions, icon: Target, tone: 'text-emerald-500 bg-emerald-500/10' },
    { label: 'أطول سلسلة', value: totals.bestStreak, icon: Flame, tone: 'text-orange-500 bg-orange-500/10' },
    { label: 'مهام أُنشئت', value: totals.created, icon: CalendarRange, tone: 'text-sky-500 bg-sky-500/10' },
  ];

  const bestWeekday = [...data.byWeekday].sort((a, b) => b.completed - a.completed)[0];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">الإحصائيات</h1>
          <p className="mt-1 text-sm text-muted">
            من {formatKeyShort(data.range.from)} إلى {formatKeyShort(data.range.to)}
          </p>
        </div>
        <Tabs
          tabs={ranges.map((r) => ({ value: String(r.value), label: r.label }))}
          value={String(days)}
          onChange={(v) => setDays(Number(v))}
          className="max-w-xs"
        />
      </header>

      {!hasData ? (
        <div className="card">
          <EmptyState
            icon={<TrendingUp className="h-7 w-7" />}
            title="لا توجد بيانات كافية بعد"
            description="أنجز بعض المهام وسجّل عاداتك، وستظهر إحصائياتك هنا خلال أيام."
          />
        </div>
      ) : (
        <div className={cn('space-y-6 transition-opacity', loading && 'opacity-60')}>
          {/* بطاقات الأرقام */}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="card flex items-center gap-3.5 p-4">
                <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', stat.tone)}>
                  <stat.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="num text-xl font-extrabold leading-none">{stat.value}</p>
                  <p className="mt-1 truncate text-[12px] text-muted">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* التطوّر اليومي */}
          <ChartCard
            title="المهام المنجزة يوميًا"
            subtitle={`آخر ${days} يومًا`}
            table={{
              headers: ['اليوم', 'منجزة', 'مُنشأة'],
              rows: data.daily.map((d) => [formatKeyShort(d.date), d.completed, d.created]),
            }}
          >
            <AreaChart
              data={data.daily.map((d) => ({ label: formatKeyShort(d.date), value: d.completed }))}
            />
          </ChartCard>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* أيام الأسبوع */}
            <ChartCard
              title="أكثر أيام الأسبوع إنتاجية"
              subtitle={
                bestWeekday && bestWeekday.completed > 0
                  ? `أفضل يوم لديك: ${bestWeekday.label}`
                  : 'لم تُنجز مهامًا بعد'
              }
              table={{
                headers: ['اليوم', 'المهام المنجزة'],
                rows: data.byWeekday.map((d) => [d.label, d.completed]),
              }}
            >
              <ColumnChart
                data={data.byWeekday.map((d) => ({
                  label: d.label,
                  value: d.completed,
                  highlight: bestWeekday?.weekday === d.weekday && d.completed > 0,
                }))}
              />
            </ChartCard>

            {/* نسبة الإنجاز */}
            <ChartCard title="نظرة عامة على الإنجاز" subtitle="من إجمالي ما أُنشئ في المدة">
              <div className="flex flex-wrap items-center justify-around gap-6 py-2">
                <DonutStat
                  value={totals.completed}
                  total={Math.max(totals.created, totals.completed)}
                  label="المهام المنجزة"
                  color={seriesVar(1)}
                />
                <div className="min-w-[180px] flex-1 space-y-3">
                  {data.byPriority.map((row) => {
                    const meta = PRIORITY_MAP[row.priority];
                    const max = Math.max(1, ...data.byPriority.map((p) => p.count));
                    return (
                      <div key={row.priority}>
                        <div className="mb-1 flex items-baseline justify-between">
                          <span className="flex items-center gap-1.5 text-[12px]">
                            <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                            {meta.label}
                          </span>
                          <span className="num text-[12px] font-bold">{row.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-line">
                          <div
                            className={cn('h-full rounded-full transition-[width] duration-700', meta.dot)}
                            style={{ width: `${(row.count / max) * 100}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </ChartCard>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {/* التصنيفات */}
            <ChartCard
              title="الإنجاز حسب التصنيف"
              subtitle="أين يذهب وقتك فعلًا"
              table={{
                headers: ['التصنيف', 'منجزة', 'الإجمالي'],
                rows: data.byCategory.map((c) => [c.name, c.completed, c.total]),
              }}
            >
              {data.byCategory.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">لا توجد بيانات تصنيفات بعد.</p>
              ) : (
                <BarList
                  data={data.byCategory.map((c) => ({
                    label: c.name,
                    value: c.completed,
                    secondary: `/ ${c.total}`,
                    color: `rgb(var(--c-brand))`,
                  }))}
                />
              )}
            </ChartCard>

            {/* العادات */}
            <ChartCard
              title="التزامك بالعادات"
              subtitle="نسبة الالتزام خلال آخر ٣٠ يومًا"
              table={{
                headers: ['العادة', 'الالتزام ٪', 'السلسلة'],
                rows: data.habits.map((h) => [h.title, h.rate, h.streak]),
              }}
            >
              {data.habits.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted">لم تضِف عادات بعد.</p>
              ) : (
                <BarList
                  data={data.habits.map((h) => ({
                    label: h.title,
                    value: h.rate,
                    secondary: `· سلسلة ${h.streak}`,
                  }))}
                  valueSuffix="٪"
                />
              )}
            </ChartCard>
          </div>

          {/* الأشهر */}
          <ChartCard
            title="التقدّم الشهري"
            subtitle="المهام المنجزة خلال آخر ٦ أشهر"
            table={{
              headers: ['الشهر', 'المهام المنجزة'],
              rows: data.monthly.map((m) => [m.month, m.completed]),
            }}
          >
            <ColumnChart
              data={data.monthly.map((m) => ({ label: m.month, value: m.completed }))}
              color={seriesVar(2)}
            />
          </ChartCard>
        </div>
      )}

      <p className="pb-4 text-center text-[11px] text-faint">
        كل الأرقام محسوبة بتوقيتك المحلي، وتُحدَّث فور إنجاز أي مهمة أو عادة.
      </p>
    </div>
  );
}

export { weekdayShort };
