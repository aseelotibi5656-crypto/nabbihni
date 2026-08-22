'use client';

import { useEffect, useState } from 'react';
import {
  Plus, Flame, Trophy, Percent, Target, Check, MoreVertical, Pencil, Trash2,
  Archive, Sparkles, BookOpen, Dumbbell, Droplets, Moon, Sun, Brain, Heart,
  Footprints, PenLine, Music, Leaf,
} from 'lucide-react';
import { useApp } from './app-provider';
import { Button } from '@/components/ui/button';
import { Modal, ConfirmDialog } from '@/components/ui/modal';
import { Input, Textarea, Select, EmptyState, Dropdown, DropdownItem, Progress, Checkbox } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { COLOR_CLASSES, colorOf, WEEKDAYS_SHORT_AR, HABIT_ICONS } from '@/lib/constants';
import { todayKey, addDaysKey, formatKeyShort } from '@/lib/datetime';
import { weekdayOfKey, diffDaysKeys } from '@/lib/recurrence-helpers';
import { cn } from '@/lib/utils';
import type { Habit, HabitFrequency } from '@/lib/types';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  sparkles: Sparkles, 'book-open': BookOpen, dumbbell: Dumbbell, droplets: Droplets,
  moon: Moon, sun: Sun, brain: Brain, heart: Heart, footprints: Footprints,
  'pen-line': PenLine, music: Music, leaf: Leaf,
};

export function HabitsView({ initialHabits }: { initialHabits: Habit[] }) {
  const { user, categories, refresh } = useApp();
  const toast = useToast();
  const tz = user.timezone;
  const today = todayKey(tz);

  const [habits, setHabits] = useState(initialHabits);
  const [editor, setEditor] = useState<{ open: boolean; habit: Habit | null }>({ open: false, habit: null });
  const [deleting, setDeleting] = useState<Habit | null>(null);

  async function reload() {
    refresh();
    try {
      const { habits: data } = await api.habits.list();
      setHabits(data);
    } catch {
      /* تجاهل */
    }
  }

  async function toggle(habit: Habit, date: string) {
    const done = habit.logs.includes(date);
    try {
      const { habit: updated } = await api.habits.log(habit.id, date, !done);
      setHabits((prev) => prev.map((h) => (h.id === habit.id ? updated : h)));
      if (!done && updated.stats.currentStreak > 0 && date === today) {
        toast.success(`أحسنت! 🔥 سلسلة ${updated.stats.currentStreak} ${updated.stats.currentStreak === 1 ? 'يوم' : 'أيام'}`);
      }
      refresh();
    } catch {
      toast.error('تعذّر تحديث العادة');
    }
  }

  async function remove() {
    if (!deleting) return;
    try {
      await api.habits.remove(deleting.id);
      toast.success('تم حذف العادة');
      setDeleting(null);
      void reload();
    } catch {
      toast.error('تعذّر الحذف');
    }
  }

  const totals = {
    active: habits.length,
    doneToday: habits.filter((h) => h.stats.doneToday).length,
    bestStreak: habits.reduce((m, h) => Math.max(m, h.stats.currentStreak), 0),
    avgRate: habits.length
      ? Math.round(habits.reduce((s, h) => s + h.stats.completionRate, 0) / habits.length)
      : 0,
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">العادات</h1>
          <p className="mt-1 text-sm text-muted">اِبنِ عادة يومًا بعد يوم، وشاهد سلسلتك تكبر.</p>
        </div>
        <Button onClick={() => setEditor({ open: true, habit: null })} icon={<Plus className="h-4 w-4" />}>
          عادة جديدة
        </Button>
      </header>

      {habits.length > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: 'عادات نشطة', value: totals.active, icon: Target, tone: 'text-brand bg-brand/10' },
            { label: 'أُنجزت اليوم', value: `${totals.doneToday}/${totals.active}`, icon: Check, tone: 'text-success bg-success/10' },
            { label: 'أطول سلسلة حالية', value: totals.bestStreak, icon: Flame, tone: 'text-orange-500 bg-orange-500/10' },
            { label: 'متوسط الالتزام', value: `${totals.avgRate}٪`, icon: Percent, tone: 'text-violet-500 bg-violet-500/10' },
          ].map((stat) => (
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
      )}

      {habits.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Target className="h-7 w-7" />}
            title="لم تضِف أي عادة بعد"
            description="ابدأ بعادة واحدة صغيرة — القراءة، الرياضة، أو شرب الماء — وسنتابعها معك."
            action={
              <Button onClick={() => setEditor({ open: true, habit: null })} icon={<Plus className="h-4 w-4" />}>
                أنشئ أول عادة
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {habits.map((habit) => (
            <HabitCard
              key={habit.id}
              habit={habit}
              today={today}
              onToggle={toggle}
              onEdit={() => setEditor({ open: true, habit })}
              onDelete={() => setDeleting(habit)}
            />
          ))}
        </div>
      )}

      <HabitEditor
        open={editor.open}
        habit={editor.habit}
        categories={categories}
        onClose={() => setEditor({ open: false, habit: null })}
        onSaved={reload}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        title="حذف العادة"
        message={`سيتم حذف «${deleting?.title}» مع كامل سجلّها. لا يمكن التراجع.`}
        confirmLabel="حذف نهائيًا"
      />
    </div>
  );
}

/* -------------------------------- بطاقة عادة -------------------------------- */

function HabitCard({
  habit,
  today,
  onToggle,
  onEdit,
  onDelete,
}: {
  habit: Habit;
  today: string;
  onToggle: (habit: Habit, date: string) => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const tone = colorOf(habit.color);
  const Icon = ICONS[habit.icon] ?? Sparkles;
  const logs = new Set(habit.logs);

  // آخر ٩ أسابيع كخريطة حرارية
  const heatmapDays = 63;
  const heatmap = Array.from({ length: heatmapDays }, (_, i) =>
    addDaysKey(today, -(heatmapDays - 1 - i)),
  );

  const scheduled = (key: string) =>
    habit.frequency === 'daily' ||
    habit.frequency === 'times_per_week' ||
    habit.targetDays.includes(weekdayOfKey(key));

  return (
    <div className="card overflow-hidden">
      <div className="flex items-start gap-3.5 p-5">
        <span className={cn('flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl', tone.bg, tone.text)}>
          <Icon className="h-5 w-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-[15px] font-bold">{habit.title}</h3>
              <p className="mt-0.5 text-[12px] text-muted">
                {habit.frequency === 'daily'
                  ? 'يوميًا'
                  : habit.frequency === 'custom_days'
                    ? habit.targetDays.map((d) => WEEKDAYS_SHORT_AR[d]).join('، ')
                    : `${habit.targetPerPeriod} مرات أسبوعيًا`}
                {habit.timeOfDay && <span className="num"> · {habit.timeOfDay}</span>}
              </p>
            </div>

            <Dropdown
              align="end"
              trigger={
                <button className="rounded-lg p-1.5 text-faint hover:bg-fg/5 hover:text-fg" aria-label="خيارات">
                  <MoreVertical className="h-4 w-4" />
                </button>
              }
            >
              {(close) => (
                <>
                  <DropdownItem icon={<Pencil className="h-4 w-4" />} onClick={() => { close(); onEdit(); }}>
                    تعديل
                  </DropdownItem>
                  <DropdownItem danger icon={<Trash2 className="h-4 w-4" />} onClick={() => { close(); onDelete(); }}>
                    حذف
                  </DropdownItem>
                </>
              )}
            </Dropdown>
          </div>

          {/* زر إنجاز اليوم */}
          <button
            onClick={() => onToggle(habit, today)}
            className={cn(
              'mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-all active:scale-[.98]',
              habit.stats.doneToday
                ? cn('text-white', tone.solid)
                : cn('border', tone.bg, tone.text, 'border-current/20 hover:brightness-95'),
            )}
          >
            <Check className="h-4 w-4" strokeWidth={3} />
            {habit.stats.doneToday ? 'أُنجزت اليوم' : 'سجّل إنجاز اليوم'}
          </button>
        </div>
      </div>

      {/* الإحصائيات */}
      <div className="grid grid-cols-3 divide-x divide-x-reverse divide-line border-y border-line">
        {[
          { label: 'السلسلة الحالية', value: habit.stats.currentStreak, icon: Flame, tint: 'text-orange-500' },
          { label: 'أطول سلسلة', value: habit.stats.longestStreak, icon: Trophy, tint: 'text-amber-500' },
          { label: 'الالتزام', value: `${habit.stats.completionRate}٪`, icon: Percent, tint: 'text-emerald-500' },
        ].map((stat) => (
          <div key={stat.label} className="px-3 py-3 text-center">
            <stat.icon className={cn('mx-auto mb-1 h-3.5 w-3.5', stat.tint)} />
            <p className="num text-base font-extrabold">{stat.value}</p>
            <p className="text-[10px] leading-tight text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* هذا الأسبوع */}
      <div className="p-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12px] font-bold text-muted">هذا الأسبوع</p>
          <p className="num text-[11px] text-faint">
            {habit.stats.weekProgress.filter((d) => d.done).length}/
            {habit.stats.weekProgress.filter((d) => d.scheduled).length}
          </p>
        </div>
        <div className="flex gap-1.5">
          {habit.stats.weekProgress.map((day) => (
            <button
              key={day.date}
              onClick={() => onToggle(habit, day.date)}
              title={`${formatKeyShort(day.date)} — ${day.done ? 'أُنجزت' : 'لم تُنجز'}`}
              className={cn(
                'group flex flex-1 flex-col items-center gap-1',
                !day.scheduled && 'opacity-40',
              )}
            >
              <span className="text-[9px] text-faint">{WEEKDAYS_SHORT_AR[weekdayOfKey(day.date)].slice(0, 3)}</span>
              <span
                className={cn(
                  'flex h-8 w-full items-center justify-center rounded-lg transition-all group-hover:brightness-110',
                  day.done ? cn('text-white', tone.solid) : 'bg-line',
                )}
              >
                {day.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
              </span>
            </button>
          ))}
        </div>

        <Progress
          value={habit.stats.completionRate}
          className="mt-4"
          barClassName={tone.solid}
          label={`نسبة الالتزام بـ${habit.title}`}
        />

        {/* خريطة آخر ٩ أسابيع */}
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-bold text-muted">آخر ٩ أسابيع</p>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" dir="ltr">
            {heatmap.map((key) => (
              <span
                key={key}
                title={`${formatKeyShort(key)}${logs.has(key) ? ' — أُنجزت' : ''}`}
                className={cn(
                  'h-2.5 w-2.5 rounded-[3px]',
                  logs.has(key) ? tone.solid : scheduled(key) ? 'bg-line' : 'bg-line/40',
                )}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------ نافذة إنشاء/تعديل ------------------------------ */

function HabitEditor({
  open,
  habit,
  categories,
  onClose,
  onSaved,
}: {
  open: boolean;
  habit: Habit | null;
  categories: { id: string; name: string }[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    icon: 'sparkles',
    color: 'emerald',
    frequency: 'daily' as HabitFrequency,
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    targetPerPeriod: 3,
    unit: 'مرة',
    timeOfDay: '',
    categoryId: '',
    reminderEnabled: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // تعبئة النموذج عند فتح النافذة (تعديل) أو تفريغه (إنشاء جديد)
  useEffect(() => {
    if (!open) return;
    setErrors({});
    if (habit) {
      setForm({
        title: habit.title,
        description: habit.description ?? '',
        icon: habit.icon,
        color: habit.color,
        frequency: habit.frequency,
        targetDays: habit.targetDays,
        targetPerPeriod: habit.targetPerPeriod,
        unit: habit.unit,
        timeOfDay: habit.timeOfDay ?? '',
        categoryId: habit.categoryId ?? '',
        reminderEnabled: Boolean(habit.timeOfDay),
      });
    } else {
      setForm({
        title: '', description: '', icon: 'sparkles', color: 'emerald', frequency: 'daily',
        targetDays: [0, 1, 2, 3, 4, 5, 6], targetPerPeriod: 3, unit: 'مرة', timeOfDay: '',
        categoryId: '', reminderEnabled: false,
      });
    }
  }, [open, habit]);

  async function save() {
    if (!form.title.trim()) {
      setErrors({ title: 'اسم العادة مطلوب' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description || null,
        icon: form.icon,
        color: form.color,
        frequency: form.frequency,
        targetDays: form.targetDays,
        targetPerPeriod: form.targetPerPeriod,
        unit: form.unit,
        timeOfDay: form.timeOfDay || null,
        categoryId: form.categoryId || null,
        reminderEnabled: form.reminderEnabled,
      };
      if (habit) {
        await api.habits.update(habit.id, payload);
        toast.success('تم حفظ العادة ✅');
      } else {
        await api.habits.create(payload);
        toast.success('تمت إضافة العادة 🌱', 'ابدأ اليوم واصنع سلسلتك.');
      }
      onSaved();
      onClose();
    } catch (error) {
      toast.error('تعذّر الحفظ', error instanceof Error ? error.message : undefined);
    } finally {
      setSaving(false);
    }
  }

  const toggleDay = (day: number) =>
    setForm((prev) => ({
      ...prev,
      targetDays: prev.targetDays.includes(day)
        ? prev.targetDays.filter((d) => d !== day)
        : [...prev.targetDays, day].sort(),
    }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={habit ? 'تعديل العادة' : 'عادة جديدة'}
      description="حدّد التكرار والوقت، وسنتابع التزامك يومًا بيوم."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={save} loading={saving}>
            {habit ? 'حفظ' : 'إضافة'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Input
          label="اسم العادة"
          data-autofocus
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          error={errors.title}
          placeholder="قراءة ٢٠ صفحة"
          required
        />

        <Textarea
          label="وصف مختصر"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="لماذا تريد هذه العادة؟"
          rows={2}
        />

        <div>
          <span className="label">الأيقونة</span>
          <div className="flex flex-wrap gap-2">
            {HABIT_ICONS.map((key) => {
              const Icon = ICONS[key] ?? Sparkles;
              return (
                <button
                  key={key}
                  onClick={() => setForm({ ...form, icon: key })}
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl border transition-all',
                    form.icon === key ? 'border-brand bg-brand/10 text-brand' : 'border-line text-muted',
                  )}
                  aria-label={key}
                >
                  <Icon className="h-4 w-4" />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <span className="label">اللون</span>
          <div className="flex flex-wrap gap-2">
            {Object.keys(COLOR_CLASSES).map((key) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, color: key })}
                aria-label={key}
                className={cn(
                  'h-8 w-8 rounded-lg transition-transform',
                  COLOR_CLASSES[key].solid,
                  form.color === key && 'ring-2 ring-fg ring-offset-2 ring-offset-bg',
                )}
              />
            ))}
          </div>
        </div>

        <div>
          <span className="label">التكرار</span>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { value: 'daily', label: 'كل يوم' },
                { value: 'custom_days', label: 'أيام محددة' },
                { value: 'times_per_week', label: 'مرات أسبوعيًا' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setForm({ ...form, frequency: option.value })}
                className={cn(
                  'rounded-xl border py-2.5 text-[13px] font-semibold transition-all',
                  form.frequency === option.value
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line text-muted hover:border-brand/30',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {form.frequency === 'custom_days' && (
          <div className="animate-fade-in">
            <span className="label">أيام الأسبوع</span>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS_SHORT_AR.map((label, index) => (
                <button
                  key={label}
                  onClick={() => toggleDay(index)}
                  className={cn(
                    'min-w-[54px] rounded-lg border px-2 py-2 text-[12px] font-semibold transition-all',
                    form.targetDays.includes(index)
                      ? 'border-brand bg-brand text-brand-fg'
                      : 'border-line text-muted',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {form.frequency === 'times_per_week' && (
          <Input
            label="كم مرة في الأسبوع؟"
            type="number"
            min={1}
            max={7}
            value={form.targetPerPeriod}
            onChange={(e) => setForm({ ...form, targetPerPeriod: Number(e.target.value) })}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="وقت التذكير"
            type="time"
            value={form.timeOfDay}
            onChange={(e) => setForm({ ...form, timeOfDay: e.target.value })}
            hint="اختياري"
          />
          <Select
            label="التصنيف"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">بدون تصنيف</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        {form.timeOfDay && (
          <Checkbox
            checked={form.reminderEnabled}
            onChange={(v) => setForm({ ...form, reminderEnabled: v })}
            label="ذكّرني في هذا الوقت"
          />
        )}
      </div>
    </Modal>
  );
}

export { Archive, diffDaysKeys };
