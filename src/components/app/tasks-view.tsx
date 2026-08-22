'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus, Search, SlidersHorizontal, X, ListChecks, PartyPopper, CheckCircle2,
  AlertTriangle, CalendarDays, Inbox, Folder, Pencil, Trash2,
} from 'lucide-react';
import { useApp } from './app-provider';
import { TaskItem } from './task-item';
import { RescheduleModal } from './reschedule-modal';
import { Button } from '@/components/ui/button';
import { EmptyState, Tabs, SkeletonList } from '@/components/ui/primitives';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Input } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { PRIORITIES, colorOf, COLOR_CLASSES } from '@/lib/constants';
import { dayKey, relativeDayLabel, todayKey } from '@/lib/datetime';
import { cn, groupBy } from '@/lib/utils';
import type { Task, Category } from '@/lib/types';

type View = 'today' | 'upcoming' | 'overdue' | 'all' | 'completed';

const tabs: { value: View; label: string }[] = [
  { value: 'today', label: 'اليوم' },
  { value: 'upcoming', label: 'القادمة' },
  { value: 'overdue', label: 'المتأخرة' },
  { value: 'all', label: 'الكل' },
  { value: 'completed', label: 'المكتملة' },
];

export function TasksView({
  initialTasks,
  counts,
}: {
  initialTasks: Task[];
  counts: Record<View, number>;
}) {
  const { user, settings, categories, openTaskModal, refresh } = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const toast = useToast();

  const [view, setView] = useState<View>((params.get('view') as View) || 'today');
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [priority, setPriority] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState(params.get('category') ?? '');
  const [rescheduling, setRescheduling] = useState<Task | null>(null);
  const [categoryManager, setCategoryManager] = useState(false);

  const highlight = params.get('highlight');
  const tz = user.timezone;

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const { tasks: data } = await api.tasks.list({
          view,
          q: query || undefined,
          priority: priority.join(',') || undefined,
          categoryId: categoryId || undefined,
        });
        if (!cancelled) setTasks(data);
      } catch {
        if (!cancelled) toast.error('تعذّر تحميل المهام');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    const timer = setTimeout(load, query ? 280 : 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, query, priority, categoryId]);

  const reload = () => {
    refresh();
    void api.tasks
      .list({
        view,
        q: query || undefined,
        priority: priority.join(',') || undefined,
        categoryId: categoryId || undefined,
      })
      .then(({ tasks: data }) => setTasks(data))
      .catch(() => {});
  };

  const activeFilters = priority.length + (categoryId ? 1 : 0);

  /** تجميع المهام حسب اليوم لعرض أوضح في العروض الممتدة */
  const grouped = useMemo(() => {
    if (view === 'today') return null;
    const withDate = tasks.filter((t) => t.dueAt);
    const withoutDate = tasks.filter((t) => !t.dueAt);
    const byDay = groupBy(withDate, (t) => dayKey(t.dueAt!, tz));
    const keys = Object.keys(byDay).sort();
    return { byDay, keys, withoutDate };
  }, [tasks, view, tz]);

  const emptyStates: Record<View, { icon: React.ReactNode; title: string; description: string }> = {
    today: {
      icon: <PartyPopper className="h-7 w-7" />,
      title: 'ليس لديك مهام اليوم 🎉',
      description: 'استمتع بيومك أو أضف مهمة جديدة.',
    },
    upcoming: {
      icon: <CalendarDays className="h-7 w-7" />,
      title: 'لا مهام قادمة',
      description: 'جدولك نظيف — أضف ما تريد إنجازه قريبًا.',
    },
    overdue: {
      icon: <CheckCircle2 className="h-7 w-7" />,
      title: 'لا توجد مهام متأخرة 👏',
      description: 'أنت منظّم تمامًا. استمر على هذا الإيقاع.',
    },
    all: {
      icon: <Inbox className="h-7 w-7" />,
      title: 'لا توجد مهام بعد',
      description: 'ابدأ بإضافة أول مهمة ودعنا نذكّرك بها في وقتها.',
    },
    completed: {
      icon: <ListChecks className="h-7 w-7" />,
      title: 'لم تُكمل مهامًا بعد',
      description: 'أنجز أول مهمة وستظهر هنا.',
    },
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">المهام</h1>
          <p className="mt-1 text-sm text-muted">
            <span className="num">{tasks.length}</span> مهمة في هذا العرض
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={() => setCategoryManager(true)}
            icon={<Folder className="h-4 w-4" />}
          >
            التصنيفات
          </Button>
          <Button onClick={() => openTaskModal()} icon={<Plus className="h-4 w-4" />}>
            إضافة مهمة
          </Button>
        </div>
      </header>

      <Tabs
        tabs={tabs.map((tab) => ({ ...tab, count: counts[tab.value] }))}
        value={view}
        onChange={(next) => {
          setView(next);
          router.replace(`/tasks?view=${next}`, { scroll: false });
        }}
      />

      {/* البحث والفلاتر */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في المهام…"
              className="field h-11 pr-10"
              aria-label="بحث في المهام"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-faint hover:text-fg"
                aria-label="مسح البحث"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={cn(
              'flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-semibold transition-colors',
              activeFilters > 0 || showFilters
                ? 'border-brand bg-brand/8 text-brand'
                : 'border-line text-muted hover:text-fg',
            )}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span className="hidden sm:inline">فلاتر</span>
            {activeFilters > 0 && (
              <span className="num rounded-full bg-brand px-1.5 text-[10px] font-bold text-brand-fg">
                {activeFilters}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="animate-fade-in space-y-3 rounded-2xl border border-line bg-surface p-4">
            <div>
              <p className="mb-2 text-[12px] font-bold text-muted">الأولوية</p>
              <div className="flex flex-wrap gap-2">
                {PRIORITIES.map((option) => {
                  const active = priority.includes(option.value);
                  return (
                    <button
                      key={option.value}
                      onClick={() =>
                        setPriority((prev) =>
                          active ? prev.filter((p) => p !== option.value) : [...prev, option.value],
                        )
                      }
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                        active ? 'border-transparent ring-1 ring-inset ' + option.chip : 'border-line text-muted',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', option.dot)} />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-2 text-[12px] font-bold text-muted">التصنيف</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCategoryId('')}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                    !categoryId ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted',
                  )}
                >
                  الكل
                </button>
                {categories.map((category) => {
                  const tone = colorOf(category.color);
                  const active = categoryId === category.id;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setCategoryId(active ? '' : category.id)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                        active ? cn('border-transparent ring-1 ring-inset', tone.bg, tone.text, tone.ring) : 'border-line text-muted',
                      )}
                    >
                      <span className={cn('h-1.5 w-1.5 rounded-full', tone.solid)} />
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeFilters > 0 && (
              <button
                onClick={() => {
                  setPriority([]);
                  setCategoryId('');
                }}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-danger hover:underline"
              >
                <X className="h-3.5 w-3.5" />
                مسح كل الفلاتر
              </button>
            )}
          </div>
        )}
      </div>

      {/* القائمة */}
      {loading && tasks.length === 0 ? (
        <SkeletonList rows={5} />
      ) : tasks.length === 0 ? (
        <div className="card">
          <EmptyState
            {...emptyStates[view]}
            action={
              <Button onClick={() => openTaskModal()} icon={<Plus className="h-4 w-4" />}>
                إضافة مهمة
              </Button>
            }
          />
        </div>
      ) : grouped ? (
        <div className="space-y-6">
          {grouped.keys.map((key) => (
            <section key={key} className="space-y-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-bold text-muted">
                {relativeDayLabel(key, tz)}
                <span className="h-px flex-1 bg-line" />
                <span className="num text-[11px] font-normal">{grouped.byDay[key].length}</span>
              </h2>
              {grouped.byDay[key].map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  timezone={tz}
                  timeFormat={settings.timeFormat}
                  onChanged={reload}
                  onEdit={(t) => openTaskModal(t)}
                  onReschedule={setRescheduling}
                  highlighted={highlight === task.id}
                />
              ))}
            </section>
          ))}

          {grouped.withoutDate.length > 0 && (
            <section className="space-y-2.5">
              <h2 className="flex items-center gap-2 text-[13px] font-bold text-muted">
                بلا تاريخ
                <span className="h-px flex-1 bg-line" />
                <span className="num text-[11px] font-normal">{grouped.withoutDate.length}</span>
              </h2>
              {grouped.withoutDate.map((task) => (
                <TaskItem
                  key={task.id}
                  task={task}
                  timezone={tz}
                  timeFormat={settings.timeFormat}
                  onChanged={reload}
                  onEdit={(t) => openTaskModal(t)}
                  onReschedule={setRescheduling}
                  highlighted={highlight === task.id}
                />
              ))}
            </section>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              timezone={tz}
              timeFormat={settings.timeFormat}
              onChanged={reload}
              onEdit={(t) => openTaskModal(t)}
              onReschedule={setRescheduling}
              highlighted={highlight === task.id}
            />
          ))}
        </div>
      )}

      <RescheduleModal
        task={rescheduling}
        timezone={tz}
        onClose={() => setRescheduling(null)}
        onDone={reload}
      />

      <CategoryManager
        open={categoryManager}
        onClose={() => setCategoryManager(false)}
        categories={categories}
        onChanged={refresh}
      />
    </div>
  );
}

/* ------------------------------ إدارة التصنيفات ------------------------------ */

function CategoryManager({
  open,
  onClose,
  categories,
  onChanged,
}: {
  open: boolean;
  onClose: () => void;
  categories: Category[];
  onChanged: () => void;
}) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [color, setColor] = useState('indigo');
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  async function submit() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await api.categories.update(editingId, { name, color });
        toast.success('تم تحديث التصنيف');
      } else {
        await api.categories.create({ name, color });
        toast.success('تمت إضافة التصنيف');
      }
      setName('');
      setEditingId(null);
      onChanged();
    } catch (error) {
      toast.error('تعذّر الحفظ', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.categories.remove(deleting.id);
      toast.success('تم حذف التصنيف');
      setDeleting(null);
      onChanged();
    } catch {
      toast.error('تعذّر الحذف');
    }
  }

  return (
    <>
      <Modal open={open} onClose={onClose} title="التصنيفات" description="نظّم مهامك في مجموعات واضحة." size="md">
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-bg/50 p-4">
            <Input
              label={editingId ? 'تعديل التصنيف' : 'تصنيف جديد'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: مشاريع جانبية"
            />
            <div className="mt-3">
              <p className="mb-2 text-[12px] font-bold text-muted">اللون</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(COLOR_CLASSES).map((key) => (
                  <button
                    key={key}
                    onClick={() => setColor(key)}
                    aria-label={key}
                    className={cn(
                      'h-7 w-7 rounded-lg transition-transform',
                      COLOR_CLASSES[key].solid,
                      color === key && 'ring-2 ring-fg ring-offset-2 ring-offset-bg',
                    )}
                  />
                ))}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <Button onClick={submit} loading={saving} size="sm">
                {editingId ? 'حفظ' : 'إضافة'}
              </Button>
              {editingId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingId(null);
                    setName('');
                  }}
                >
                  إلغاء
                </Button>
              )}
            </div>
          </div>

          <ul className="space-y-2">
            {categories.map((category) => {
              const tone = colorOf(category.color);
              return (
                <li
                  key={category.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5"
                >
                  <span className={cn('h-6 w-1.5 shrink-0 rounded-full', tone.solid)} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span>
                  <span className="num shrink-0 text-[11px] text-faint">{category.taskCount ?? 0}</span>
                  <button
                    onClick={() => {
                      setEditingId(category.id);
                      setName(category.name);
                      setColor(category.color);
                    }}
                    className="shrink-0 rounded-lg p-1.5 text-faint hover:text-brand"
                    aria-label="تعديل"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleting(category)}
                    className="shrink-0 rounded-lg p-1.5 text-faint hover:text-danger"
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="حذف التصنيف"
        message={`سيُحذف «${deleting?.name}» وتبقى مهامه موجودة بلا تصنيف.`}
        confirmLabel="حذف"
      />
    </>
  );
}

export { todayKey, AlertTriangle };
