'use client';

import { useState } from 'react';
import {
  Check, Clock, Repeat, Bell, Paperclip, MoreVertical, Pencil, Trash2,
  CalendarClock, AlertTriangle, FileText,
} from 'lucide-react';
import { Dropdown, DropdownItem, Badge } from '@/components/ui/primitives';
import { ConfirmDialog } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { PRIORITY_MAP, colorOf } from '@/lib/constants';
import { formatTime, formatDateShort, humanizeUntil, reminderLabel, todayKey, dayKey } from '@/lib/datetime';
import { describeRule } from '@/lib/recurrence';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

/**
 * بطاقة مهمة واحدة — تُستخدم في لوحة التحكم وصفحة المهام والتقويم.
 * كل زر فيها يؤدي عملية حقيقية على الخادم.
 */
export function TaskItem({
  task,
  timezone,
  timeFormat = '12',
  onChanged,
  onEdit,
  onReschedule,
  highlighted,
  compact,
}: {
  task: Task;
  timezone: string;
  timeFormat?: '12' | '24';
  onChanged: () => void;
  onEdit: (task: Task) => void;
  onReschedule?: (task: Task) => void;
  highlighted?: boolean;
  compact?: boolean;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const done = task.status === 'completed';
  const overdue = !done && task.dueAt && new Date(task.dueAt).getTime() < Date.now();
  const priority = PRIORITY_MAP[task.priority];
  const tone = colorOf(task.category?.color);

  async function toggle() {
    setBusy(true);
    try {
      await api.tasks.complete(task.id, !done);
      if (!done) {
        toast.success(
          task.isRecurring ? 'أُنجزت — وأنشأنا النسخة التالية 🔁' : 'أحسنت! تم إنجاز المهمة ✅',
        );
      }
      onChanged();
    } catch {
      toast.error('تعذّر تحديث المهمة');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await api.tasks.remove(task.id);
      toast.success('تم حذف المهمة');
      setConfirming(false);
      onChanged();
    } catch {
      toast.error('تعذّر حذف المهمة');
    } finally {
      setBusy(false);
    }
  }

  const dueLabel = (() => {
    if (!task.dueAt) return null;
    if (task.allDay) {
      const key = dayKey(task.dueAt, timezone);
      return key === todayKey(timezone) ? 'اليوم' : formatDateShort(task.dueAt, timezone);
    }
    const key = dayKey(task.dueAt, timezone);
    const time = formatTime(task.dueAt, timezone, timeFormat);
    return key === todayKey(timezone) ? time : `${formatDateShort(task.dueAt, timezone)} · ${time}`;
  })();

  return (
    <>
      <div
        className={cn(
          'group relative overflow-hidden rounded-2xl border bg-surface transition-all',
          highlighted ? 'border-brand ring-2 ring-brand/25' : 'border-line hover:border-brand/25',
          done && 'opacity-70',
          busy && 'pointer-events-none opacity-60',
        )}
      >
        {/* شريط لون التصنيف */}
        <span className={cn('absolute inset-y-0 right-0 w-1', done ? 'bg-success' : tone.solid)} />

        <div className={cn('flex items-start gap-3 pr-4', compact ? 'p-3' : 'p-3.5 sm:p-4')}>
          {/* مربع الإكمال */}
          <button
            onClick={toggle}
            disabled={busy}
            aria-label={done ? 'إلغاء الإكمال' : 'وضع علامة مكتملة'}
            className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border-2 transition-all active:scale-90',
              done
                ? 'border-success bg-success text-white'
                : 'border-line hover:border-success hover:bg-success/10',
            )}
          >
            {done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
          </button>

          <div className="min-w-0 flex-1">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-full text-right"
              aria-expanded={expanded}
            >
              <p
                className={cn(
                  'text-[15px] font-semibold leading-snug',
                  done && 'text-faint line-through',
                )}
              >
                {task.title}
              </p>
            </button>

            {task.description && !expanded && (
              <p className="mt-0.5 truncate text-[13px] text-muted">{task.description}</p>
            )}

            {/* الشارات */}
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {dueLabel && (
                <span
                  className={cn(
                    'num inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold',
                    overdue ? 'bg-danger/10 text-danger' : 'bg-fg/5 text-muted',
                  )}
                >
                  {overdue ? <AlertTriangle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {dueLabel}
                </span>
              )}

              {!done && (
                <Badge className={priority.chip} dot={priority.dot}>
                  {priority.label}
                </Badge>
              )}

              {task.category && (
                <Badge className={cn(tone.bg, tone.text, tone.ring)}>{task.category.name}</Badge>
              )}

              {task.isRecurring && (
                <span className="inline-flex items-center gap-1 rounded-md bg-fg/5 px-1.5 py-0.5 text-[11px] text-muted">
                  <Repeat className="h-3 w-3" />
                  متكرّرة
                </span>
              )}

              {task.reminders.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-fg/5 px-1.5 py-0.5 text-[11px] text-muted">
                  <Bell className="h-3 w-3" />
                  <span className="num">{task.reminders.length}</span>
                </span>
              )}

              {task.attachments.length > 0 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-fg/5 px-1.5 py-0.5 text-[11px] text-muted">
                  <Paperclip className="h-3 w-3" />
                  <span className="num">{task.attachments.length}</span>
                </span>
              )}
            </div>

            {/* التفاصيل الموسّعة */}
            {expanded && (
              <div className="mt-3 animate-fade-in space-y-2.5 rounded-xl bg-bg/60 p-3 text-[13px]">
                {task.description && <p className="leading-relaxed text-muted">{task.description}</p>}
                {task.notes && (
                  <p className="flex items-start gap-2 leading-relaxed text-muted">
                    <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {task.notes}
                  </p>
                )}
                {task.durationMin && (
                  <p className="text-muted">
                    المدة: <span className="num font-semibold">{task.durationMin}</span> دقيقة
                  </p>
                )}
                {task.recurrenceRule && (
                  <p className="text-muted">التكرار: {describeRule(task.recurrenceRule)}</p>
                )}
                {task.reminders.length > 0 && (
                  <p className="text-muted">
                    التذكيرات: {task.reminders.map((r) => reminderLabel(r.offsetMinutes)).join('، ')}
                  </p>
                )}
                {task.dueAt && !done && (
                  <p className="text-muted">الوقت المتبقّي: {humanizeUntil(task.dueAt)}</p>
                )}
                {task.attachments.length > 0 && (
                  <ul className="space-y-1">
                    {task.attachments.map((file) => (
                      <li key={file.id}>
                        <a
                          href={file.url}
                          download={file.name}
                          className="inline-flex items-center gap-1.5 text-brand hover:underline"
                        >
                          <Paperclip className="h-3 w-3" />
                          {file.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* القائمة */}
          <Dropdown
            align="end"
            trigger={
              <button
                className="shrink-0 rounded-lg p-1.5 text-faint opacity-0 transition-opacity hover:bg-fg/5 hover:text-fg focus:opacity-100 group-hover:opacity-100 sm:opacity-0"
                aria-label="خيارات المهمة"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            }
          >
            {(close) => (
              <>
                <DropdownItem
                  icon={<Pencil className="h-4 w-4" />}
                  onClick={() => {
                    close();
                    onEdit(task);
                  }}
                >
                  تعديل
                </DropdownItem>
                {onReschedule && (
                  <DropdownItem
                    icon={<CalendarClock className="h-4 w-4" />}
                    onClick={() => {
                      close();
                      onReschedule(task);
                    }}
                  >
                    إعادة جدولة
                  </DropdownItem>
                )}
                <div className="my-1 border-t border-line" />
                <DropdownItem
                  danger
                  icon={<Trash2 className="h-4 w-4" />}
                  onClick={() => {
                    close();
                    setConfirming(true);
                  }}
                >
                  حذف
                </DropdownItem>
              </>
            )}
          </Dropdown>
        </div>
      </div>

      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        onConfirm={remove}
        loading={busy}
        title="حذف المهمة"
        message={`سيتم حذف «${task.title}» نهائيًا مع تذكيراتها. لا يمكن التراجع عن هذا الإجراء.`}
        confirmLabel="حذف نهائيًا"
      />
    </>
  );
}
