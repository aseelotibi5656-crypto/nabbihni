'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, ChevronLeft, Plus, CalendarDays, MapPin, Target } from 'lucide-react';
import { useApp } from './app-provider';
import { TaskItem } from './task-item';
import { Button } from '@/components/ui/button';
import { EmptyState, Tabs } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { colorOf, MONTHS_AR, WEEKDAYS_SHORT_AR } from '@/lib/constants';
import {
  todayKey, addDaysKey, monthGrid, weekOf, formatKeyFull, formatTime,
  weekdayOfKey, formatKeyShort,
} from '@/lib/datetime';
import { diffDaysKeys } from '@/lib/recurrence-helpers';
import { cn } from '@/lib/utils';
import type { CalendarEvent, CalendarView as ViewMode, Habit, Task } from '@/lib/types';

/**
 * التقويم المتكامل: عرض يومي وأسبوعي وشهري وسنوي،
 * يجمع المهام والمواعيد والعادات في مكان واحد.
 */
export function CalendarView({
  initialTasks,
  initialEvents,
  habits,
}: {
  initialTasks: Task[];
  initialEvents: CalendarEvent[];
  habits: Habit[];
}) {
  const { user, settings, openTaskModal, refresh } = useApp();
  const toast = useToast();
  const tz = user.timezone;
  const weekStart = settings.weekStartsOn;

  const [mode, setMode] = useState<ViewMode>(settings.defaultView);
  const [cursor, setCursor] = useState(todayKey(tz));
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [selectedDay, setSelectedDay] = useState<string>(todayKey(tz));

  const range = useMemo(() => rangeFor(mode, cursor, weekStart), [mode, cursor, weekStart]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [taskData, eventData] = await Promise.all([
          api.tasks.list({ view: 'range', from: range.from, to: range.to, limit: 500 }),
          api.events.list({ from: range.from, to: range.to }),
        ]);
        if (cancelled) return;
        setTasks(taskData.tasks);
        setEvents(eventData.events);
      } catch {
        if (!cancelled) toast.error('تعذّر تحميل التقويم');
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range.from, range.to]);

  const reload = () => {
    refresh();
    void api.tasks
      .list({ view: 'range', from: range.from, to: range.to, limit: 500 })
      .then(({ tasks: data }) => setTasks(data))
      .catch(() => {});
  };

  /** فهرس العناصر حسب اليوم */
  const byDay = useMemo(() => {
    const map = new Map<string, { tasks: Task[]; events: CalendarEvent[] }>();
    const ensure = (key: string) => {
      if (!map.has(key)) map.set(key, { tasks: [], events: [] });
      return map.get(key)!;
    };
    for (const task of tasks) {
      if (!task.dueAt) continue;
      ensure(localKey(task.dueAt, tz)).tasks.push(task);
    }
    for (const event of events) {
      ensure(localKey(event.startAt, tz)).events.push(event);
    }
    return map;
  }, [tasks, events, tz]);

  const habitsFor = (key: string) =>
    habits.filter(
      (habit) =>
        habit.frequency === 'daily' ||
        habit.frequency === 'times_per_week' ||
        habit.targetDays.includes(weekdayOfKey(key)),
    );

  const move = (direction: number) => {
    if (mode === 'day') setCursor(addDaysKey(cursor, direction));
    else if (mode === 'week') setCursor(addDaysKey(cursor, direction * 7));
    else if (mode === 'month') setCursor(shiftMonth(cursor, direction));
    else setCursor(shiftMonth(cursor, direction * 12));
  };

  const title = (() => {
    const [year, month] = cursor.split('-').map(Number);
    if (mode === 'day') return formatKeyFull(cursor);
    if (mode === 'week') {
      const days = weekOf(cursor, weekStart);
      return `${formatKeyShort(days[0])} — ${formatKeyShort(days[6])}`;
    }
    if (mode === 'month') return `${MONTHS_AR[month - 1]} ${year}`;
    return String(year);
  })();

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">التقويم</h1>
          <p className="mt-1 text-sm text-muted">{title}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-xl border border-line">
            <button
              onClick={() => move(-1)}
              className="rounded-r-xl p-2.5 text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              aria-label="السابق"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                setCursor(todayKey(tz));
                setSelectedDay(todayKey(tz));
              }}
              className="border-x border-line px-3 py-2 text-[13px] font-semibold"
            >
              اليوم
            </button>
            <button
              onClick={() => move(1)}
              className="rounded-l-xl p-2.5 text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              aria-label="التالي"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          </div>
          <Button onClick={() => openTaskModal(null, { date: selectedDay })} icon={<Plus className="h-4 w-4" />}>
            <span className="hidden sm:inline">إضافة</span>
          </Button>
        </div>
      </header>

      <Tabs
        tabs={[
          { value: 'day' as const, label: 'يوم' },
          { value: 'week' as const, label: 'أسبوع' },
          { value: 'month' as const, label: 'شهر' },
          { value: 'year' as const, label: 'سنة' },
        ]}
        value={mode}
        onChange={setMode}
        className="max-w-sm"
      />

      {mode === 'day' && (
        <DayView
          dayKey={cursor}
          data={byDay.get(cursor)}
          habits={habitsFor(cursor)}
          timezone={tz}
          timeFormat={settings.timeFormat}
          onChanged={reload}
          onEdit={(task) => openTaskModal(task)}
          onAdd={() => openTaskModal(null, { date: cursor })}
        />
      )}

      {mode === 'week' && (
        <WeekView
          days={weekOf(cursor, weekStart)}
          byDay={byDay}
          timezone={tz}
          timeFormat={settings.timeFormat}
          today={todayKey(tz)}
          onSelect={(key) => {
            setCursor(key);
            setSelectedDay(key);
            setMode('day');
          }}
        />
      )}

      {mode === 'month' && (
        <MonthView
          cursor={cursor}
          byDay={byDay}
          weekStart={weekStart}
          today={todayKey(tz)}
          selected={selectedDay}
          onSelect={(key) => setSelectedDay(key)}
          onOpen={(key) => {
            setCursor(key);
            setMode('day');
          }}
        />
      )}

      {mode === 'year' && (
        <YearView
          year={Number(cursor.slice(0, 4))}
          byDay={byDay}
          today={todayKey(tz)}
          onSelect={(key) => {
            setCursor(key);
            setMode('month');
          }}
        />
      )}

      {/* تفاصيل اليوم المختار في العرض الشهري */}
      {mode === 'month' && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <CalendarDays className="h-4 w-4 text-brand" />
            {formatKeyFull(selectedDay)}
          </h2>
          <DayView
            dayKey={selectedDay}
            data={byDay.get(selectedDay)}
            habits={habitsFor(selectedDay)}
            timezone={tz}
            timeFormat={settings.timeFormat}
            onChanged={reload}
            onEdit={(task) => openTaskModal(task)}
            onAdd={() => openTaskModal(null, { date: selectedDay })}
            compact
          />
        </section>
      )}
    </div>
  );
}

/* --------------------------------- العرض اليومي --------------------------------- */

function DayView({
  dayKey: _dayKey,
  data,
  habits,
  timezone,
  timeFormat,
  onChanged,
  onEdit,
  onAdd,
  compact,
}: {
  dayKey: string;
  data?: { tasks: Task[]; events: CalendarEvent[] };
  habits: Habit[];
  timezone: string;
  timeFormat: '12' | '24';
  onChanged: () => void;
  onEdit: (task: Task) => void;
  onAdd: () => void;
  compact?: boolean;
}) {
  const tasks = data?.tasks ?? [];
  const events = data?.events ?? [];
  const isEmpty = tasks.length === 0 && events.length === 0 && habits.length === 0;

  if (isEmpty) {
    return (
      <div className="card">
        <EmptyState
          compact={compact}
          icon={<CalendarDays className="h-7 w-7" />}
          title="لا شيء في هذا اليوم"
          description="يومك فارغ — أضف مهمة أو موعدًا."
          action={
            <Button onClick={onAdd} icon={<Plus className="h-4 w-4" />} size="sm">
              إضافة
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {events.length > 0 && (
        <div className="space-y-2">
          {events.map((event) => (
            <div key={event.id} className="relative overflow-hidden rounded-2xl border border-line bg-surface p-4">
              <span className={cn('absolute inset-y-0 right-0 w-1', colorOf(event.color).solid)} />
              <div className="pr-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[15px] font-semibold">{event.title}</p>
                  <span className="num shrink-0 text-[12px] font-semibold text-muted">
                    {event.allDay
                      ? 'طوال اليوم'
                      : `${formatTime(event.startAt, timezone, timeFormat)} — ${formatTime(event.endAt, timezone, timeFormat)}`}
                  </span>
                </div>
                {event.location && (
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] text-muted">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.location}
                  </p>
                )}
                {event.description && (
                  <p className="mt-1 text-[13px] text-muted">{event.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tasks.length > 0 && (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              timezone={timezone}
              timeFormat={timeFormat}
              onChanged={onChanged}
              onEdit={onEdit}
              compact
            />
          ))}
        </div>
      )}

      {habits.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 flex items-center gap-2 text-[13px] font-bold text-muted">
            <Target className="h-4 w-4 text-emerald-500" />
            عادات هذا اليوم
          </p>
          <div className="flex flex-wrap gap-2">
            {habits.map((habit) => (
              <span
                key={habit.id}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ring-inset',
                  colorOf(habit.color).bg,
                  colorOf(habit.color).text,
                  colorOf(habit.color).ring,
                )}
              >
                <span className={cn('h-1.5 w-1.5 rounded-full', colorOf(habit.color).solid)} />
                {habit.title}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------- العرض الأسبوعي -------------------------------- */

function WeekView({
  days,
  byDay,
  timezone,
  timeFormat,
  today,
  onSelect,
}: {
  days: string[];
  byDay: Map<string, { tasks: Task[]; events: CalendarEvent[] }>;
  timezone: string;
  timeFormat: '12' | '24';
  today: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
      {days.map((key) => {
        const data = byDay.get(key);
        const items = [...(data?.events ?? []), ...(data?.tasks ?? [])];
        const isToday = key === today;
        return (
          <button
            key={key}
            onClick={() => onSelect(key)}
            className={cn(
              'flex min-h-[140px] flex-col rounded-2xl border p-3 text-right transition-all hover:border-brand/40',
              isToday ? 'border-brand bg-brand/[.05]' : 'border-line bg-surface',
            )}
          >
            <div className="mb-2 flex items-baseline justify-between">
              <span className={cn('text-[11px] font-bold', isToday ? 'text-brand' : 'text-muted')}>
                {WEEKDAYS_SHORT_AR[weekdayOfKey(key)]}
              </span>
              <span className={cn('num text-lg font-extrabold', isToday && 'text-brand')}>
                {Number(key.slice(-2))}
              </span>
            </div>

            <div className="flex-1 space-y-1">
              {items.slice(0, 4).map((item) => {
                const isTask = 'status' in item;
                const at = isTask ? (item as Task).dueAt : (item as CalendarEvent).startAt;
                const color = isTask
                  ? ((item as Task).category?.color ?? 'indigo')
                  : (item as CalendarEvent).color;
                return (
                  <div
                    key={item.id}
                    className={cn(
                      'truncate rounded-lg px-1.5 py-1 text-[10px] font-medium',
                      colorOf(color).bg,
                      colorOf(color).text,
                      isTask && (item as Task).status === 'completed' && 'line-through opacity-60',
                    )}
                  >
                    {at && !(isTask && (item as Task).allDay) && (
                      <span className="num ml-1">{formatTime(at, timezone, timeFormat)}</span>
                    )}
                    {item.title}
                  </div>
                );
              })}
              {items.length > 4 && (
                <p className="num text-[10px] text-faint">+{items.length - 4} أخرى</p>
              )}
              {items.length === 0 && <p className="text-[10px] text-faint">—</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------- العرض الشهري -------------------------------- */

function MonthView({
  cursor,
  byDay,
  weekStart,
  today,
  selected,
  onSelect,
  onOpen,
}: {
  cursor: string;
  byDay: Map<string, { tasks: Task[]; events: CalendarEvent[] }>;
  weekStart: number;
  today: string;
  selected: string;
  onSelect: (key: string) => void;
  onOpen: (key: string) => void;
}) {
  const [year, month] = cursor.split('-').map(Number);
  const grid = monthGrid(year, month, weekStart);
  const headers = Array.from({ length: 7 }, (_, i) => WEEKDAYS_SHORT_AR[(weekStart + i) % 7]);

  return (
    <div className="card overflow-hidden p-3 sm:p-4">
      <div className="mb-2 grid grid-cols-7 gap-1 text-center">
        {headers.map((label) => (
          <div key={label} className="py-1 text-[11px] font-bold text-faint">
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((key) => {
          const inMonth = Number(key.slice(5, 7)) === month;
          const data = byDay.get(key);
          const count = (data?.tasks.length ?? 0) + (data?.events.length ?? 0);
          const isToday = key === today;
          const isSelected = key === selected;
          const dots = [
            ...(data?.events ?? []).slice(0, 3).map((e) => e.color),
            ...(data?.tasks ?? []).slice(0, 3).map((t) => t.category?.color ?? 'indigo'),
          ].slice(0, 3);

          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              onDoubleClick={() => onOpen(key)}
              className={cn(
                'flex aspect-square flex-col items-center justify-start rounded-xl border p-1 transition-all sm:aspect-auto sm:min-h-[72px] sm:items-start sm:p-2',
                isSelected
                  ? 'border-brand bg-brand/[.07]'
                  : isToday
                    ? 'border-brand/40'
                    : 'border-transparent hover:border-line',
                !inMonth && 'opacity-35',
              )}
            >
              <span
                className={cn(
                  'num text-[12px] font-bold sm:text-[13px]',
                  isToday && 'flex h-6 w-6 items-center justify-center rounded-full bg-brand text-brand-fg',
                )}
              >
                {Number(key.slice(-2))}
              </span>

              <div className="mt-1 flex gap-0.5 sm:hidden">
                {dots.map((color, i) => (
                  <span key={i} className={cn('h-1 w-1 rounded-full', colorOf(color).solid)} />
                ))}
              </div>

              <div className="hidden w-full flex-1 space-y-0.5 overflow-hidden sm:block">
                {(data?.events ?? []).slice(0, 1).map((event) => (
                  <div
                    key={event.id}
                    className={cn('truncate rounded px-1 py-0.5 text-[9px] font-medium', colorOf(event.color).bg, colorOf(event.color).text)}
                  >
                    {event.title}
                  </div>
                ))}
                {(data?.tasks ?? []).slice(0, 2).map((task) => (
                  <div
                    key={task.id}
                    className={cn(
                      'truncate rounded px-1 py-0.5 text-[9px] font-medium',
                      colorOf(task.category?.color).bg,
                      colorOf(task.category?.color).text,
                      task.status === 'completed' && 'line-through opacity-60',
                    )}
                  >
                    {task.title}
                  </div>
                ))}
                {count > 3 && <p className="num px-1 text-[9px] text-faint">+{count - 3}</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- العرض السنوي -------------------------------- */

function YearView({
  year,
  byDay,
  today,
  onSelect,
}: {
  year: number;
  byDay: Map<string, { tasks: Task[]; events: CalendarEvent[] }>;
  today: string;
  onSelect: (key: string) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {MONTHS_AR.map((label, index) => {
        const month = index + 1;
        const grid = monthGrid(year, month, 0);
        return (
          <button
            key={label}
            onClick={() => onSelect(`${year}-${String(month).padStart(2, '0')}-01`)}
            className="card p-3 text-right transition-all hover:border-brand/40"
          >
            <p className="mb-2 text-[13px] font-bold">{label}</p>
            <div className="grid grid-cols-7 gap-[3px]">
              {WEEKDAYS_SHORT_AR.map((d) => (
                <span key={d} className="text-center text-[8px] text-faint">
                  {d.slice(0, 1)}
                </span>
              ))}
              {grid.map((key) => {
                const inMonth = Number(key.slice(5, 7)) === month;
                const data = byDay.get(key);
                const busy = (data?.tasks.length ?? 0) + (data?.events.length ?? 0) > 0;
                const isToday = key === today;
                return (
                  <span
                    key={key}
                    className={cn(
                      'num flex aspect-square items-center justify-center rounded text-[8px]',
                      !inMonth && 'opacity-0',
                      isToday && 'bg-brand font-bold text-brand-fg',
                      !isToday && busy && 'bg-brand/15 font-bold text-brand',
                    )}
                  >
                    {Number(key.slice(-2))}
                  </span>
                );
              })}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* --------------------------------- مساعدات --------------------------------- */

function rangeFor(mode: ViewMode, cursor: string, weekStart: number) {
  if (mode === 'day') return { from: cursor, to: cursor };
  if (mode === 'week') {
    const days = weekOf(cursor, weekStart);
    return { from: days[0], to: days[6] };
  }
  if (mode === 'month') {
    const [year, month] = cursor.split('-').map(Number);
    const grid = monthGrid(year, month, weekStart);
    return { from: grid[0], to: grid[grid.length - 1] };
  }
  const year = Number(cursor.slice(0, 4));
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function shiftMonth(key: string, delta: number) {
  const [year, month, day] = key.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  const safeDay = Math.min(day, lastDay);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${p(date.getUTCMonth() + 1)}-${p(safeDay)}`;
}

function localKey(iso: string, tz: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
  return parts;
}

export { diffDaysKeys };
