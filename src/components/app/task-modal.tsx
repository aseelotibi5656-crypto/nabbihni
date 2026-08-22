'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Calendar, Clock, Flag, Folder, Repeat, Bell, Timer, FileText, Paperclip,
  Plus, X, Trash2, MapPin,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input, Textarea, Select, Checkbox } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { PRIORITIES, REMINDER_PRESETS, WEEKDAYS_SHORT_AR, colorOf } from '@/lib/constants';
import { todayKey, toInputDate, toInputTime, reminderLabel } from '@/lib/datetime';
import { describeRule } from '@/lib/recurrence';
import { cn, formatBytes } from '@/lib/utils';
import type { Category, Priority, RecurrenceFreq, RecurrenceRule, Task } from '@/lib/types';

type Mode = 'task' | 'event';

interface Draft {
  title: string;
  description: string;
  notes: string;
  date: string;
  time: string;
  allDay: boolean;
  durationMin: string;
  priority: Priority;
  categoryId: string;
  reminderOffsets: number[];
  recurrence: RecurrenceRule | null;
  location: string;
  endTime: string;
  attachments: { name: string; url: string; mimeType: string; size: number }[];
}

const emptyDraft = (tz: string): Draft => ({
  title: '',
  description: '',
  notes: '',
  date: todayKey(tz),
  time: '',
  allDay: false,
  durationMin: '',
  priority: 'medium',
  categoryId: '',
  reminderOffsets: [10],
  recurrence: null,
  location: '',
  endTime: '',
  attachments: [],
});

export function TaskModal({
  open,
  onClose,
  onSaved,
  categories,
  timezone,
  task,
  initial,
  defaultMode = 'task',
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  categories: Category[];
  timezone: string;
  task?: Task | null;
  initial?: Partial<Draft> | null;
  defaultMode?: Mode;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [draft, setDraft] = useState<Draft>(emptyDraft(timezone));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customReminder, setCustomReminder] = useState('');

  const editing = Boolean(task);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setMode(defaultMode);
    if (task) {
      setDraft({
        title: task.title,
        description: task.description ?? '',
        notes: task.notes ?? '',
        date: toInputDate(task.dueAt, timezone) || todayKey(timezone),
        time: task.allDay ? '' : toInputTime(task.dueAt, timezone),
        allDay: task.allDay,
        durationMin: task.durationMin ? String(task.durationMin) : '',
        priority: task.priority,
        categoryId: task.categoryId ?? '',
        reminderOffsets: task.reminders.map((r) => r.offsetMinutes),
        recurrence: task.recurrenceRule,
        location: '',
        endTime: '',
        attachments: task.attachments.map((a) => ({
          name: a.name,
          url: a.url,
          mimeType: a.mimeType,
          size: a.size,
        })),
      });
      setShowAdvanced(Boolean(task.notes || task.durationMin || task.attachments.length));
    } else {
      setDraft({ ...emptyDraft(timezone), ...initial });
      setShowAdvanced(false);
    }
  }, [open, task, initial, timezone, defaultMode]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const toggleReminder = (value: number) =>
    setDraft((prev) => ({
      ...prev,
      reminderOffsets: prev.reminderOffsets.includes(value)
        ? prev.reminderOffsets.filter((v) => v !== value)
        : [...prev.reminderOffsets, value].slice(0, 6),
    }));

  async function onFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, 3);
    const encoded = await Promise.all(
      files.map(
        (file) =>
          new Promise<Draft['attachments'][number]>((resolve, reject) => {
            if (file.size > 2_000_000) {
              reject(new Error(`${file.name} أكبر من ٢ ميجابايت`));
              return;
            }
            const reader = new FileReader();
            reader.onload = () =>
              resolve({
                name: file.name,
                url: String(reader.result),
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
              });
            reader.onerror = () => reject(new Error('تعذّر قراءة الملف'));
            reader.readAsDataURL(file);
          }),
      ),
    ).catch((error: Error) => {
      toast.error('تعذّر إرفاق الملف', error.message);
      return [] as Draft['attachments'];
    });

    if (encoded.length) {
      set('attachments', [...draft.attachments, ...encoded].slice(0, 5));
    }
    event.target.value = '';
  }

  async function save() {
    setErrors({});
    if (!draft.title.trim()) {
      setErrors({ title: 'اسم المهمة مطلوب' });
      return;
    }
    setSaving(true);
    try {
      if (mode === 'event') {
        const payload = {
          title: draft.title,
          description: draft.description || null,
          location: draft.location || null,
          date: draft.date,
          startTime: draft.allDay ? null : draft.time || '09:00',
          endTime: draft.allDay ? null : draft.endTime || null,
          allDay: draft.allDay,
          categoryId: draft.categoryId || null,
          reminderOffsets: draft.reminderOffsets,
          color: categories.find((c) => c.id === draft.categoryId)?.color ?? 'indigo',
        };
        await api.events.create(payload);
        toast.success('تم إنشاء الموعد ✅');
      } else {
        const payload = {
          title: draft.title,
          description: draft.description || null,
          notes: draft.notes || null,
          date: draft.date || null,
          time: draft.allDay ? null : draft.time || null,
          allDay: draft.allDay || !draft.time,
          durationMin: draft.durationMin ? Number(draft.durationMin) : null,
          priority: draft.priority,
          categoryId: draft.categoryId || null,
          reminderOffsets: draft.reminderOffsets,
          recurrence: draft.recurrence,
          attachments: draft.attachments,
        };
        if (editing && task) {
          await api.tasks.update(task.id, payload);
          toast.success('تم حفظ التعديلات ✅');
        } else {
          await api.tasks.create(payload);
          toast.success('تمت إضافة المهمة ✅', 'سنذكّرك بها في وقتها.');
        }
      }
      onSaved();
      onClose();
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.details) setErrors(error.details);
        else toast.error('تعذّر الحفظ', error.message);
      }
    } finally {
      setSaving(false);
    }
  }

  const reminderChips = useMemo(
    () =>
      [...new Set([...REMINDER_PRESETS.map((r) => r.value), ...draft.reminderOffsets])].sort(
        (a, b) => a - b,
      ),
    [draft.reminderOffsets],
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={editing ? 'تعديل المهمة' : mode === 'event' ? 'موعد جديد' : 'مهمة جديدة'}
      description={
        editing ? 'عدّل التفاصيل ثم احفظ.' : 'اكتب ما لا تريد نسيانه، وحدّد متى نذكّرك به.'
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            إلغاء
          </Button>
          <Button onClick={save} loading={saving} data-autofocus>
            {editing ? 'حفظ التعديلات' : 'إضافة'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {!editing && (
          <div className="flex gap-1 rounded-xl bg-elevated p-1">
            {(
              [
                { value: 'task', label: 'مهمة' },
                { value: 'event', label: 'موعد' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                onClick={() => setMode(option.value)}
                className={cn(
                  'flex-1 rounded-lg py-2 text-sm font-semibold transition-all',
                  mode === option.value ? 'bg-surface text-fg shadow-soft' : 'text-muted hover:text-fg',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}

        <Input
          label={mode === 'event' ? 'اسم الموعد' : 'اسم المهمة'}
          data-autofocus
          value={draft.title}
          onChange={(e) => set('title', e.target.value)}
          error={errors.title}
          placeholder={mode === 'event' ? 'اجتماع الفريق' : 'مراجعة الفصل الثالث'}
          required
        />

        <Textarea
          label="الوصف"
          value={draft.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="تفاصيل إضافية (اختياري)"
          rows={2}
        />

        {/* التاريخ والوقت */}
        <div className="rounded-2xl border border-line bg-bg/50 p-4">
          <div className="mb-3 flex items-center gap-2 text-[13px] font-bold text-muted">
            <Calendar className="h-4 w-4" />
            التوقيت
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="التاريخ"
              type="date"
              value={draft.date}
              onChange={(e) => set('date', e.target.value)}
              error={errors.date}
            />
            <Input
              label={mode === 'event' ? 'وقت البداية' : 'الوقت'}
              type="time"
              value={draft.time}
              onChange={(e) => set('time', e.target.value)}
              disabled={draft.allDay}
              error={errors.time}
            />
            {mode === 'event' && (
              <Input
                label="وقت النهاية"
                type="time"
                value={draft.endTime}
                onChange={(e) => set('endTime', e.target.value)}
                disabled={draft.allDay}
              />
            )}
            {mode === 'event' && (
              <div className="relative">
                <Input
                  label="المكان"
                  value={draft.location}
                  onChange={(e) => set('location', e.target.value)}
                  placeholder="قاعة الاجتماعات"
                  className="pr-9"
                />
                <MapPin className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
              </div>
            )}
          </div>
          <div className="mt-3">
            <Checkbox checked={draft.allDay} onChange={(v) => set('allDay', v)} label="طوال اليوم" />
          </div>
        </div>

        {/* الأولوية والتصنيف */}
        {mode === 'task' && (
          <div>
            <span className="label flex items-center gap-1.5">
              <Flag className="h-3.5 w-3.5" />
              الأولوية
            </span>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => set('priority', option.value)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-xl border py-2.5 text-[13px] font-semibold transition-all',
                    draft.priority === option.value
                      ? 'border-transparent ring-2 ring-inset ' + option.chip
                      : 'border-line text-muted hover:border-brand/30',
                  )}
                >
                  <span className={cn('h-2 w-2 rounded-full', option.dot)} />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <Select
          label="التصنيف"
          value={draft.categoryId}
          onChange={(e) => set('categoryId', e.target.value)}
        >
          <option value="">بدون تصنيف</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </Select>

        {/* التذكيرات */}
        <div className="rounded-2xl border border-line bg-bg/50 p-4">
          <div className="mb-1 flex items-center gap-2 text-[13px] font-bold text-muted">
            <Bell className="h-4 w-4" />
            التذكير
          </div>
          <p className="mb-3 text-[11px] text-faint">
            يمكنك اختيار أكثر من تذكير لنفس المهمة (حتى ٦ تذكيرات).
          </p>
          <div className="flex flex-wrap gap-2">
            {reminderChips.map((value) => {
              const active = draft.reminderOffsets.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleReminder(value)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-all',
                    active
                      ? 'border-brand bg-brand/12 text-brand'
                      : 'border-line text-muted hover:border-brand/30',
                  )}
                >
                  {reminderLabel(value)}
                </button>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min={0}
              max={43200}
              value={customReminder}
              onChange={(e) => setCustomReminder(e.target.value)}
              placeholder="وقت مخصص بالدقائق"
              className="field h-9 flex-1 text-[13px]"
            />
            <Button
              size="sm"
              variant="secondary"
              type="button"
              onClick={() => {
                const value = Number(customReminder);
                if (Number.isFinite(value) && value >= 0) {
                  toggleReminder(value);
                  setCustomReminder('');
                }
              }}
            >
              إضافة
            </Button>
          </div>
        </div>

        {/* التكرار */}
        {mode === 'task' && <RecurrenceEditor value={draft.recurrence} onChange={(v) => set('recurrence', v)} />}

        {/* خيارات متقدمة */}
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex w-full items-center justify-between rounded-xl border border-line px-4 py-3 text-sm font-semibold text-muted transition-colors hover:border-brand/30 hover:text-fg"
        >
          خيارات إضافية (مدة، ملاحظات، مرفقات)
          <Plus className={cn('h-4 w-4 transition-transform', showAdvanced && 'rotate-45')} />
        </button>

        {showAdvanced && (
          <div className="animate-fade-in space-y-4">
            <div className="relative">
              <Input
                label="مدة المهمة (بالدقائق)"
                type="number"
                min={0}
                max={1440}
                value={draft.durationMin}
                onChange={(e) => set('durationMin', e.target.value)}
                placeholder="٦٠"
                className="pr-9"
              />
              <Timer className="pointer-events-none absolute right-3 top-[38px] h-4 w-4 text-faint" />
            </div>

            <Textarea
              label="ملاحظات"
              value={draft.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="أي تفاصيل تريد تذكّرها"
              rows={3}
            />

            <div>
              <span className="label flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5" />
                مرفقات
              </span>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line py-4 text-sm text-muted transition-colors hover:border-brand/40 hover:text-fg">
                <Plus className="h-4 w-4" />
                اختر ملفات (حتى ٢ ميجابايت لكل ملف)
                <input type="file" multiple className="sr-only" onChange={onFiles} />
              </label>
              {draft.attachments.length > 0 && (
                <ul className="mt-2 space-y-1.5">
                  {draft.attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2 text-[13px]"
                    >
                      <FileText className="h-4 w-4 shrink-0 text-muted" />
                      <span className="min-w-0 flex-1 truncate">{file.name}</span>
                      <span className="num shrink-0 text-[11px] text-faint">{formatBytes(file.size)}</span>
                      <button
                        type="button"
                        onClick={() =>
                          set(
                            'attachments',
                            draft.attachments.filter((_, i) => i !== index),
                          )
                        }
                        className="shrink-0 rounded-lg p-1 text-faint hover:text-danger"
                        aria-label="حذف المرفق"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------- محرّر التكرار ------------------------------- */

function RecurrenceEditor({
  value,
  onChange,
}: {
  value: RecurrenceRule | null;
  onChange: (v: RecurrenceRule | null) => void;
}) {
  const enabled = Boolean(value);
  const rule = value ?? { freq: 'weekly' as RecurrenceFreq, interval: 1, byWeekday: [] };

  const update = (patch: Partial<RecurrenceRule>) => onChange({ ...rule, ...patch });

  const toggleDay = (day: number) => {
    const current = rule.byWeekday ?? [];
    const next = current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort();
    update({ byWeekday: next });
  };

  return (
    <div className="rounded-2xl border border-line bg-bg/50 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-[13px] font-bold text-muted">
          <Repeat className="h-4 w-4" />
          التكرار
        </div>
        <Checkbox
          checked={enabled}
          onChange={(on) => onChange(on ? { freq: 'daily', interval: 1 } : null)}
          label="مهمة متكرّرة"
        />
      </div>

      {enabled && (
        <div className="mt-4 animate-fade-in space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { value: 'daily', label: 'يوميًا' },
                { value: 'weekly', label: 'أسبوعيًا' },
                { value: 'monthly', label: 'شهريًا' },
                { value: 'yearly', label: 'سنويًا' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => update({ freq: option.value })}
                className={cn(
                  'rounded-xl border py-2 text-[13px] font-semibold transition-all',
                  rule.freq === option.value
                    ? 'border-brand bg-brand/10 text-brand'
                    : 'border-line text-muted hover:border-brand/30',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>

          {rule.freq === 'weekly' && (
            <div>
              <span className="mb-2 block text-[12px] font-medium text-muted">أيام الأسبوع</span>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS_SHORT_AR.map((label, index) => {
                  const active = rule.byWeekday?.includes(index);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={cn(
                        'min-w-[52px] rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition-all',
                        active
                          ? 'border-brand bg-brand text-brand-fg'
                          : 'border-line text-muted hover:border-brand/30',
                      )}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <span className="text-[13px] text-muted">كل</span>
            <input
              type="number"
              min={1}
              max={365}
              value={rule.interval}
              onChange={(e) => update({ interval: Math.max(1, Number(e.target.value)) })}
              className="field h-9 w-20 text-center text-[13px]"
            />
            <span className="text-[13px] text-muted">
              {rule.freq === 'daily' ? 'يوم' : rule.freq === 'weekly' ? 'أسبوع' : rule.freq === 'monthly' ? 'شهر' : 'سنة'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="shrink-0 text-[13px] text-muted">حتى تاريخ</span>
            <input
              type="date"
              value={rule.until ?? ''}
              onChange={(e) => update({ until: e.target.value || null })}
              className="field h-9 flex-1 text-[13px]"
            />
            {rule.until && (
              <button
                type="button"
                onClick={() => update({ until: null })}
                className="rounded-lg p-2 text-faint hover:text-danger"
                aria-label="مسح تاريخ الانتهاء"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          <p className="rounded-xl bg-brand/8 px-3 py-2 text-[12px] font-medium text-brand">
            {describeRule(rule)}
          </p>
        </div>
      )}
    </div>
  );
}

export { colorOf, Folder, Clock };
