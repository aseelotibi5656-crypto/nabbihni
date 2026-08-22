'use client';

import { useEffect, useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { addDaysKey } from '@/lib/recurrence-helpers';
import { todayKey, formatKeyFull } from '@/lib/datetime';
import { cn } from '@/lib/utils';
import type { Task } from '@/lib/types';

/**
 * إعادة الجدولة الذكية:
 * تعرض أوقاتًا مقترحة مبنية على جدول المستخدم الفعلي، مع خيار وقت مخصص.
 */
export function RescheduleModal({
  task,
  timezone,
  onClose,
  onDone,
}: {
  task: Task | null;
  timezone: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const [suggestions, setSuggestions] = useState<{ date: string; time: string; label: string }[]>([]);
  const [selected, setSelected] = useState<{ date: string; time: string } | null>(null);
  const [custom, setCustom] = useState({ date: '', time: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!task) return;
    const today = todayKey(timezone);
    setCustom({ date: addDaysKey(today, 1), time: '19:00' });
    setSelected(null);

    api
      .suggestions()
      .then((data) => {
        setSuggestions(
          data.suggestions.length
            ? data.suggestions
            : [
                { date: today, time: '20:00', label: 'اليوم ٨:٠٠ مساءً' },
                { date: addDaysKey(today, 1), time: '09:00', label: 'غدًا ٩:٠٠ صباحًا' },
                { date: addDaysKey(today, 1), time: '19:00', label: 'غدًا ٧:٠٠ مساءً' },
              ],
        );
      })
      .catch(() => {
        setSuggestions([
          { date: addDaysKey(today, 1), time: '09:00', label: 'غدًا ٩:٠٠ صباحًا' },
          { date: addDaysKey(today, 1), time: '19:00', label: 'غدًا ٧:٠٠ مساءً' },
        ]);
      });
  }, [task, timezone]);

  async function apply() {
    if (!task) return;
    const target = selected ?? (custom.date ? custom : null);
    if (!target) {
      toast.error('اختر وقتًا أولًا');
      return;
    }
    setSaving(true);
    try {
      await api.tasks.reschedule(task.id, target.date, target.time || null);
      toast.success('تم نقل المهمة 🗓️', `${formatKeyFull(target.date)}${target.time ? ` — ${target.time}` : ''}`);
      onDone();
      onClose();
    } catch {
      toast.error('تعذّر نقل المهمة');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(task)}
      onClose={onClose}
      size="md"
      title="يبدو أنك لم تنجز هذه المهمة"
      description="هل تريد نقلها إلى وقت آخر؟"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            لاحقًا
          </Button>
          <Button onClick={apply} loading={saving} icon={<CalendarClock className="h-4 w-4" />}>
            نقل المهمة
          </Button>
        </>
      }
    >
      {task && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-line bg-bg/50 p-4">
            <p className="text-[15px] font-bold">{task.title}</p>
            {task.dueAt && (
              <p className="mt-1 text-[13px] text-muted">
                كان موعدها: {formatKeyFull(task.dueAt.slice(0, 10))}
              </p>
            )}
          </div>

          <div>
            <p className="mb-2.5 flex items-center gap-1.5 text-[13px] font-bold text-muted">
              <Sparkles className="h-3.5 w-3.5 text-brand" />
              أوقات مقترحة
            </p>
            <div className="space-y-2">
              {suggestions.map((suggestion) => {
                const active =
                  selected?.date === suggestion.date && selected?.time === suggestion.time;
                return (
                  <button
                    key={`${suggestion.date}-${suggestion.time}`}
                    onClick={() => setSelected({ date: suggestion.date, time: suggestion.time })}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl border px-4 py-3 text-right transition-all',
                      active
                        ? 'border-brand bg-brand/8 text-brand'
                        : 'border-line hover:border-brand/30',
                    )}
                  >
                    <span className="text-sm font-semibold">{suggestion.label}</span>
                    <span
                      className={cn(
                        'h-4 w-4 rounded-full border-2',
                        active ? 'border-brand bg-brand' : 'border-line',
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2.5 text-[13px] font-bold text-muted">أو حدّد وقتًا مخصصًا</p>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={custom.date}
                onChange={(e) => {
                  setCustom({ ...custom, date: e.target.value });
                  setSelected(null);
                }}
                className="field"
                aria-label="التاريخ"
              />
              <input
                type="time"
                value={custom.time}
                onChange={(e) => {
                  setCustom({ ...custom, time: e.target.value });
                  setSelected(null);
                }}
                className="field"
                aria-label="الوقت"
              />
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
