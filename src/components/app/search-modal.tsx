'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, ListChecks, CalendarDays, Target, Folder, SlidersHorizontal, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/ui/primitives';
import { api } from '@/lib/api-client';
import { PRIORITIES, colorOf } from '@/lib/constants';
import { formatDateShort, formatTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { Category, Task, CalendarEvent, Habit } from '@/lib/types';

/** بحث شامل مع فلاتر — يفتح بضغطة على شريط البحث أو بمفتاح "/" */
export function SearchModal({
  open,
  onClose,
  categories,
  timezone,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  timezone: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({ priority: '', categoryId: '', status: '', from: '', to: '' });
  const [results, setResults] = useState<{
    tasks: Task[];
    events: CalendarEvent[];
    habits: Habit[];
    categories: Category[];
    total: number;
  } | null>(null);

  const activeFilters = useMemo(
    () => Object.values(filters).filter(Boolean).length,
    [filters],
  );

  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults(null);
      setFilters({ priority: '', categoryId: '', status: '', from: '', to: '' });
      return;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (query.trim().length < 1 && !activeFilters) {
      setResults(null);
      return;
    }
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await api.search({ q: query, ...filters }));
      } finally {
        setLoading(false);
      }
    }, 260);
    return () => clearTimeout(timer);
  }, [query, filters, open, activeFilters]);

  const go = (path: string) => {
    onClose();
    router.push(path);
  };

  return (
    <Modal open={open} onClose={onClose} size="lg" title="بحث شامل" description="ابحث في كل شيء داخل حسابك.">
      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            data-autofocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب كلمة للبحث…"
            className="field h-12 pr-10 text-[15px]"
          />
        </div>

        <button
          onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 text-[13px] font-semibold text-muted transition-colors hover:text-fg"
        >
          <SlidersHorizontal className="h-4 w-4" />
          الفلاتر
          {activeFilters > 0 && (
            <span className="num rounded-full bg-brand/12 px-1.5 py-0.5 text-[10px] font-bold text-brand">
              {activeFilters}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="grid animate-fade-in gap-3 rounded-2xl border border-line bg-bg/50 p-4 sm:grid-cols-2">
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="field h-10 text-[13px]"
            >
              <option value="">كل الأولويات</option>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>

            <select
              value={filters.categoryId}
              onChange={(e) => setFilters({ ...filters, categoryId: e.target.value })}
              className="field h-10 text-[13px]"
            >
              <option value="">كل التصنيفات</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="field h-10 text-[13px]"
            >
              <option value="">كل الحالات</option>
              <option value="pending">قيد التنفيذ</option>
              <option value="completed">مكتملة</option>
            </select>

            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.from}
                onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                className="field h-10 flex-1 text-[13px]"
                aria-label="من تاريخ"
              />
              <input
                type="date"
                value={filters.to}
                onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                className="field h-10 flex-1 text-[13px]"
                aria-label="إلى تاريخ"
              />
            </div>

            {activeFilters > 0 && (
              <button
                onClick={() => setFilters({ priority: '', categoryId: '', status: '', from: '', to: '' })}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-line py-2 text-[13px] font-semibold text-muted hover:text-danger sm:col-span-2"
              >
                <X className="h-3.5 w-3.5" />
                مسح الفلاتر
              </button>
            )}
          </div>
        )}

        {loading && <p className="py-8 text-center text-sm text-muted">جارٍ البحث…</p>}

        {!loading && results && results.total === 0 && (
          <EmptyState
            compact
            icon={<Search className="h-6 w-6" />}
            title="لا توجد نتائج"
            description="جرّب كلمة أخرى أو خفّف الفلاتر."
          />
        )}

        {!loading && results && results.total > 0 && (
          <div className="max-h-[46vh] space-y-4 overflow-y-auto">
            <Group title="المهام" icon={<ListChecks className="h-3.5 w-3.5" />} count={results.tasks.length}>
              {results.tasks.slice(0, 12).map((task) => (
                <button
                  key={task.id}
                  onClick={() => go(`/tasks?highlight=${task.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right transition-colors hover:border-brand/30"
                >
                  <span className={cn('h-7 w-1 shrink-0 rounded-full', colorOf(task.category?.color).solid)} />
                  <span className={cn('min-w-0 flex-1 truncate text-sm', task.status === 'completed' && 'text-faint line-through')}>
                    {task.title}
                  </span>
                  {task.dueAt && (
                    <span className="num shrink-0 text-[11px] text-faint">
                      {formatDateShort(task.dueAt, timezone)}
                    </span>
                  )}
                </button>
              ))}
            </Group>

            <Group title="المواعيد" icon={<CalendarDays className="h-3.5 w-3.5" />} count={results.events.length}>
              {results.events.slice(0, 8).map((event) => (
                <button
                  key={event.id}
                  onClick={() => go(`/calendar?highlight=${event.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right transition-colors hover:border-brand/30"
                >
                  <span className={cn('h-7 w-1 shrink-0 rounded-full', colorOf(event.color).solid)} />
                  <span className="min-w-0 flex-1 truncate text-sm">{event.title}</span>
                  <span className="num shrink-0 text-[11px] text-faint">
                    {formatDateShort(event.startAt, timezone)} · {formatTime(event.startAt, timezone)}
                  </span>
                </button>
              ))}
            </Group>

            <Group title="العادات" icon={<Target className="h-3.5 w-3.5" />} count={results.habits.length}>
              {results.habits.map((habit) => (
                <button
                  key={habit.id}
                  onClick={() => go('/habits')}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right transition-colors hover:border-brand/30"
                >
                  <span className={cn('h-7 w-1 shrink-0 rounded-full', colorOf(habit.color).solid)} />
                  <span className="min-w-0 flex-1 truncate text-sm">{habit.title}</span>
                  <span className="num shrink-0 text-[11px] text-faint">
                    سلسلة {habit.stats.currentStreak}
                  </span>
                </button>
              ))}
            </Group>

            <Group title="التصنيفات" icon={<Folder className="h-3.5 w-3.5" />} count={results.categories.length}>
              {results.categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => go(`/tasks?category=${category.id}`)}
                  className="flex w-full items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-right transition-colors hover:border-brand/30"
                >
                  <span className={cn('h-7 w-1 shrink-0 rounded-full', colorOf(category.color).solid)} />
                  <span className="min-w-0 flex-1 truncate text-sm">{category.name}</span>
                  <span className="num shrink-0 text-[11px] text-faint">{category.taskCount ?? 0} مهمة</span>
                </button>
              ))}
            </Group>
          </div>
        )}

        {!loading && !results && (
          <p className="py-8 text-center text-sm text-muted">
            اكتب كلمة للبحث في المهام والمواعيد والعادات والتصنيفات.
          </p>
        )}
      </div>
    </Modal>
  );
}

function Group({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}) {
  if (!count) return null;
  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold text-muted">
        {icon}
        {title}
        <span className="num">({count})</span>
      </p>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}
