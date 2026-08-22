'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2, AlertTriangle, ListTodo, TrendingUp, Clock, ArrowLeft, Plus,
  Sparkles, PartyPopper, Flame, CalendarClock, MapPin, Target,
} from 'lucide-react';
import { useApp } from './app-provider';
import { TaskItem } from './task-item';
import { RescheduleModal } from './reschedule-modal';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState, Progress } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { colorOf } from '@/lib/constants';
import { formatTime, greeting, formatKeyFull, todayKey, humanizeUntil } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { AgendaItem, DashboardSummary, Habit, Task } from '@/lib/types';

export function DashboardView({
  summary,
  agenda,
  tasks,
  habits,
  overdue,
}: {
  summary: DashboardSummary;
  agenda: AgendaItem[];
  tasks: Task[];
  habits: Habit[];
  overdue: Task[];
}) {
  const { user, settings, openTaskModal, openAi, refresh } = useApp();
  const toast = useToast();
  const [rescheduling, setRescheduling] = useState<Task | null>(null);
  const tz = user.timezone;

  const stats = [
    {
      label: 'مهام اليوم',
      value: summary.todayTotal,
      icon: ListTodo,
      tone: 'text-brand bg-brand/10',
      href: '/tasks?view=today',
    },
    {
      label: 'المكتملة',
      value: summary.todayCompleted,
      icon: CheckCircle2,
      tone: 'text-success bg-success/10',
      href: '/tasks?view=completed',
    },
    {
      label: 'المتأخرة',
      value: summary.overdue,
      icon: AlertTriangle,
      tone: summary.overdue > 0 ? 'text-danger bg-danger/10' : 'text-muted bg-fg/5',
      href: '/tasks?view=overdue',
    },
    {
      label: 'نسبة الإنجاز',
      value: `${summary.completionRate}٪`,
      icon: TrendingUp,
      tone: 'text-amber-500 bg-amber-500/10',
      href: '/analytics',
    },
  ];

  async function toggleHabit(habit: Habit) {
    try {
      await api.habits.log(habit.id, todayKey(tz), !habit.stats.doneToday);
      if (!habit.stats.doneToday) toast.success(`أحسنت! «${habit.title}» ✅`);
      refresh();
    } catch {
      toast.error('تعذّر تحديث العادة');
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* الترويسة */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-[28px]">
            {greeting(tz)}، {user.name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted">{formatKeyFull(todayKey(tz))}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openAi} icon={<Sparkles className="h-4 w-4" />}>
            المساعد الذكي
          </Button>
          <Button onClick={() => openTaskModal()} icon={<Plus className="h-4 w-4" />}>
            إضافة مهمة
          </Button>
        </div>
      </header>

      {/* الملخص السريع */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="card card-hover flex items-center gap-3.5 p-4"
          >
            <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', stat.tone)}>
              <stat.icon className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="num text-2xl font-extrabold leading-none">{stat.value}</p>
              <p className="mt-1 truncate text-[12px] text-muted">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* شريط التقدّم اليومي */}
      <div className="card p-5">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold">تقدّم اليوم</p>
          <p className="num text-sm font-bold text-brand">{summary.completionRate}٪</p>
        </div>
        <Progress value={summary.completionRate} label="نسبة إنجاز اليوم" />
        <p className="mt-3 text-[13px] text-muted">
          أنجزت <span className="num font-bold text-fg">{summary.todayCompleted}</span> من{' '}
          <span className="num font-bold text-fg">{summary.todayTotal}</span> مهمة
          {summary.habitsDueToday > 0 && (
            <>
              {' '}و <span className="num font-bold text-fg">{summary.habitsDoneToday}</span> من{' '}
              <span className="num font-bold text-fg">{summary.habitsDueToday}</span> عادة
            </>
          )}
          .
        </p>
      </div>

      {/* تنبيه المهام المتأخرة — إعادة الجدولة الذكية */}
      {overdue.length > 0 && settings.smartRescheduleEnabled && (
        <div className="rounded-2xl border border-warning/30 bg-warning/[.06] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-warning/15 text-warning">
              <CalendarClock className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15px] font-bold">
                يبدو أنك لم تنجز{' '}
                <span className="num">{overdue.length}</span>{' '}
                {overdue.length === 1 ? 'مهمة' : 'مهام'}
              </p>
              <p className="mt-0.5 text-[13px] text-muted">هل تريد نقلها إلى وقت آخر؟</p>
              <div className="mt-3 space-y-2">
                {overdue.slice(0, 3).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{task.title}</span>
                    {task.dueAt && (
                      <span className="shrink-0 text-[11px] text-danger">
                        {humanizeUntil(task.dueAt)}
                      </span>
                    )}
                    <button
                      onClick={() => setRescheduling(task)}
                      className="shrink-0 rounded-lg bg-warning/15 px-3 py-1.5 text-[12px] font-bold text-warning transition-colors hover:bg-warning/25"
                    >
                      نقل
                    </button>
                  </div>
                ))}
              </div>
              {overdue.length > 3 && (
                <Link
                  href="/tasks?view=overdue"
                  className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold text-warning hover:underline"
                >
                  عرض كل المتأخرة ({overdue.length})
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        {/* ماذا لديك اليوم؟ */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="section-title">ماذا لديك اليوم؟</h2>
            <Link href="/tasks" className="text-[13px] font-semibold text-brand hover:underline">
              كل المهام
            </Link>
          </div>

          {agenda.length === 0 ? (
            <div className="card">
              <EmptyState
                icon={<PartyPopper className="h-7 w-7" />}
                title="ليس لديك مهام اليوم 🎉"
                description="استمتع بيومك أو أضف مهمة جديدة لتبدأ."
                action={
                  <Button onClick={() => openTaskModal()} icon={<Plus className="h-4 w-4" />}>
                    إضافة مهمة
                  </Button>
                }
              />
            </div>
          ) : (
            <Timeline
              agenda={agenda}
              tasks={tasks}
              timezone={tz}
              timeFormat={settings.timeFormat}
              onChanged={refresh}
              onEdit={(task) => openTaskModal(task)}
              onReschedule={setRescheduling}
            />
          )}
        </section>

        {/* العمود الجانبي */}
        <aside className="space-y-5">
          {/* أقرب موعد */}
          {summary.nextUp && (
            <div className="card overflow-hidden">
              <div className="border-b border-line bg-brand/[.06] px-5 py-3">
                <p className="flex items-center gap-2 text-[13px] font-bold text-brand">
                  <Clock className="h-4 w-4" />
                  أقرب موعد
                </p>
              </div>
              <div className="p-5">
                <p className="text-[15px] font-bold leading-snug">{summary.nextUp.title}</p>
                {summary.nextUp.at && (
                  <>
                    <p className="num mt-1.5 text-sm text-muted">
                      {formatTime(summary.nextUp.at, tz, settings.timeFormat)}
                    </p>
                    <p className="mt-3 inline-flex rounded-lg bg-brand/10 px-2.5 py-1 text-[12px] font-bold text-brand">
                      {humanizeUntil(summary.nextUp.at)}
                    </p>
                  </>
                )}
                {summary.nextUp.location && (
                  <p className="mt-2 flex items-center gap-1.5 text-[12px] text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {summary.nextUp.location}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* عادات اليوم */}
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-5 py-3">
              <p className="flex items-center gap-2 text-[13px] font-bold">
                <Target className="h-4 w-4 text-emerald-500" />
                عادات اليوم
              </p>
              <Link href="/habits" className="text-[12px] font-semibold text-brand hover:underline">
                الكل
              </Link>
            </div>

            {habits.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <p className="text-[13px] text-muted">لم تضِف عادات بعد.</p>
                <ButtonLink href="/habits" size="sm" variant="subtle" className="mt-3">
                  ابدأ عادة جديدة
                </ButtonLink>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {habits.slice(0, 5).map((habit) => {
                  const tone = colorOf(habit.color);
                  return (
                    <li key={habit.id} className="flex items-center gap-3 px-5 py-3">
                      <button
                        onClick={() => toggleHabit(habit)}
                        aria-label={habit.stats.doneToday ? 'إلغاء الإنجاز' : 'تسجيل الإنجاز'}
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90',
                          habit.stats.doneToday
                            ? 'border-transparent text-white ' + tone.solid
                            : 'border-line hover:border-brand',
                        )}
                      >
                        {habit.stats.doneToday && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>
                      <span
                        className={cn(
                          'min-w-0 flex-1 truncate text-sm',
                          habit.stats.doneToday && 'text-faint line-through',
                        )}
                      >
                        {habit.title}
                      </span>
                      {habit.stats.currentStreak > 0 && (
                        <span className="num flex shrink-0 items-center gap-1 text-[12px] font-bold text-orange-500">
                          <Flame className="h-3.5 w-3.5" />
                          {habit.stats.currentStreak}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* بطاقة المساعد الذكي */}
          <button
            onClick={openAi}
            className="w-full rounded-2xl border border-brand/25 bg-brand/[.06] p-5 text-right transition-all hover:bg-brand/10"
          >
            <p className="flex items-center gap-2 text-[13px] font-bold text-brand">
              <Sparkles className="h-4 w-4" />
              جرّب المساعد الذكي
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              اكتب «ذكرني أذاكر الفصل الثالث الخميس ٧ مساءً» وسننشئها لك كاملة.
            </p>
          </button>
        </aside>
      </div>

      <RescheduleModal
        task={rescheduling}
        timezone={tz}
        onClose={() => setRescheduling(null)}
        onDone={refresh}
      />
    </div>
  );
}

/** جدول اليوم مرتّبًا حسب الوقت — يدمج المهام والمواعيد */
function Timeline({
  agenda,
  tasks,
  timezone,
  timeFormat,
  onChanged,
  onEdit,
  onReschedule,
}: {
  agenda: AgendaItem[];
  tasks: Task[];
  timezone: string;
  timeFormat: '12' | '24';
  onChanged: () => void;
  onEdit: (task: Task) => void;
  onReschedule: (task: Task) => void;
}) {
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  return (
    <div className="space-y-2.5">
      {agenda.map((item) => {
        const task = item.kind === 'task' ? taskMap.get(item.id) : null;
        return (
          <div key={`${item.kind}-${item.id}`} className="flex gap-3">
            <div className="w-16 shrink-0 pt-4 text-left">
              <span className="num text-[12px] font-bold text-muted">
                {item.allDay || !item.at ? 'طوال اليوم' : formatTime(item.at, timezone, timeFormat)}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              {task ? (
                <TaskItem
                  task={task}
                  timezone={timezone}
                  timeFormat={timeFormat}
                  onChanged={onChanged}
                  onEdit={onEdit}
                  onReschedule={onReschedule}
                  compact
                />
              ) : (
                <div className="relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5">
                  <span className={cn('absolute inset-y-0 right-0 w-1', colorOf(item.color).solid)} />
                  <div className="pr-3">
                    <p className="text-[15px] font-semibold">{item.title}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                      <span className="rounded-md bg-fg/5 px-1.5 py-0.5">موعد</span>
                      {item.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {item.location}
                        </span>
                      )}
                      {item.endAt && !item.allDay && (
                        <span className="num">
                          حتى {formatTime(item.endAt, timezone, timeFormat)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
