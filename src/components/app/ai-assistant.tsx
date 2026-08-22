'use client';

import { useEffect, useRef, useState } from 'react';
import { Sparkles, SendHorizonal, Wand2, Pencil, Check, Mic, Info } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { api, ApiError } from '@/lib/api-client';
import { formatKeyFull, reminderLabel } from '@/lib/datetime';
import { describeRule } from '@/lib/recurrence';
import { PRIORITY_MAP } from '@/lib/constants';
import { cn } from '@/lib/utils';
import type { AiParseResult, Category } from '@/lib/types';

const examples = [
  'ذكرني أذاكر الفصل الثالث يوم الخميس الساعة ٧ مساءً',
  'اجتماع الفريق بكرة الساعة ١٠ صباحًا',
  'دفع الفاتورة ١٥ أغسطس',
  'مراجعة المحاضرات كل أحد وثلاثاء وخميس الساعة ٧ مساءً',
  'رياضة كل يوم الساعة ٦ العصر',
];

/**
 * المساعد الذكي — يحوّل الجملة الحرة إلى مسودّة، ثم يطلب موافقة المستخدم.
 * لا يُنشئ شيئًا دون تأكيد، وإذا نقصت معلومة يسأل عنها بدل التخمين.
 */
export function AiAssistant({
  open,
  onClose,
  onCreated,
  categories,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  categories: Category[];
}) {
  const toast = useToast();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<AiParseResult | null>(null);
  const [provider, setProvider] = useState<string>('local');
  const [editing, setEditing] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    if (!open) {
      setText('');
      setResult(null);
      setEditing(false);
    }
  }, [open]);

  async function analyze(value?: string) {
    const input = (value ?? text).trim();
    if (input.length < 2) return;
    setLoading(true);
    setResult(null);
    try {
      const response = await api.ai.parse(input);
      setResult(response.result);
      setProvider(response.provider.provider);
      if (response.result.clarification) setEditing(false);
    } catch (error) {
      toast.error('تعذّر تحليل الطلب', error instanceof ApiError ? error.message : undefined);
    } finally {
      setLoading(false);
    }
  }

  async function create() {
    if (!result) return;
    setCreating(true);
    try {
      const { draft, intent } = result;
      const kind = intent === 'create_event' ? 'event' : intent === 'create_habit' ? 'habit' : 'task';

      const payload =
        kind === 'event'
          ? {
              title: draft.title,
              date: draft.date!,
              startTime: draft.time,
              allDay: !draft.time,
              reminderOffsets: draft.reminderOffsets,
            }
          : kind === 'habit'
            ? {
                title: draft.title,
                frequency: draft.recurrence?.byWeekday?.length ? 'custom_days' : 'daily',
                targetDays: draft.recurrence?.byWeekday ?? [0, 1, 2, 3, 4, 5, 6],
                timeOfDay: draft.time,
                reminderEnabled: Boolean(draft.time),
              }
            : {
                title: draft.title,
                date: draft.date,
                time: draft.time,
                allDay: !draft.time,
                priority: draft.priority,
                durationMin: draft.durationMin,
                reminderOffsets: draft.reminderOffsets,
                recurrence: draft.recurrence,
              };

      await api.ai.create(kind, payload, draft.categoryName);
      toast.success(
        kind === 'event' ? 'تم إنشاء الموعد ✅' : kind === 'habit' ? 'تمت إضافة العادة ✅' : 'تمت إضافة المهمة ✅',
        'يمكنك تعديلها في أي وقت.',
      );
      onCreated();
      setText('');
      setResult(null);
      onClose();
    } catch (error) {
      toast.error('تعذّر الإنشاء', error instanceof ApiError ? error.message : undefined);
    } finally {
      setCreating(false);
    }
  }

  /** الإدخال الصوتي — متاح في المتصفحات التي تدعم Web Speech API */
  function startVoice() {
    const SpeechRecognition =
      (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognitionLike })
        .webkitSpeechRecognition ??
      (window as unknown as { SpeechRecognition?: new () => SpeechRecognitionLike }).SpeechRecognition;

    if (!SpeechRecognition) {
      toast.info('الإدخال الصوتي غير مدعوم في هذا المتصفح', 'جرّب Chrome على سطح المكتب أو أندرويد.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.interimResults = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      toast.error('تعذّر الاستماع', 'تأكد من السماح باستخدام المايكروفون.');
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setText(transcript);
      void analyze(transcript);
    };
    recognition.start();
  }

  const draft = result?.draft;

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="المساعد الذكي"
      description="اكتب طلبك بلغتك الطبيعية، وسأحوّله إلى مهمة كاملة."
    >
      <div className="space-y-5">
        {/* حقل الإدخال */}
        <div className="relative">
          <textarea
            ref={inputRef}
            data-autofocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void analyze();
              }
            }}
            rows={3}
            placeholder="مثال: ذكرني أذاكر الفصل الثالث يوم الخميس الساعة ٧ مساءً"
            className="field resize-none pl-24 leading-loose"
          />
          <div className="absolute bottom-3 left-3 flex gap-1.5">
            <button
              type="button"
              onClick={startVoice}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border border-line transition-colors',
                listening ? 'animate-pulse border-danger text-danger' : 'text-muted hover:text-brand',
              )}
              aria-label="إدخال صوتي"
              title="إدخال صوتي"
            >
              <Mic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => analyze()}
              disabled={loading || text.trim().length < 2}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand text-brand-fg transition-all hover:bg-brand-strong disabled:opacity-40"
              aria-label="تحليل الطلب"
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* أمثلة جاهزة */}
        {!result && !loading && (
          <div>
            <p className="mb-2 text-[12px] font-semibold text-muted">جرّب واحدًا من هذه:</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  onClick={() => {
                    setText(example);
                    void analyze(example);
                  }}
                  className="rounded-full border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-brand/40 hover:text-brand"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-line bg-elevated p-5">
            <Wand2 className="h-5 w-5 animate-pulse text-brand" />
            <span className="text-sm text-muted">أحلّل طلبك…</span>
          </div>
        )}

        {/* سؤال توضيحي عند نقص المعلومات */}
        {result?.clarification && (
          <div className="rounded-2xl border border-warning/30 bg-warning/8 p-4">
            <div className="flex items-start gap-3">
              <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-fg">{result.clarification}</p>
                <p className="mt-1 text-[12px] text-muted">
                  أضف المعلومة الناقصة في الأعلى وأعد الإرسال، أو أكمل المسودّة يدويًا بالأسفل.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* المسودّة */}
        {draft && (
          <div className="animate-fade-in overflow-hidden rounded-2xl border border-brand/25 bg-brand/[.04]">
            <div className="flex items-center justify-between border-b border-brand/15 px-4 py-3">
              <div className="flex items-center gap-2 text-[13px] font-bold text-brand">
                <Sparkles className="h-4 w-4" />
                {result.intent === 'create_event'
                  ? 'موعد مقترح'
                  : result.intent === 'create_habit'
                    ? 'عادة مقترحة'
                    : 'مهمة مقترحة'}
              </div>
              <span className="num rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                دقة {Math.round(result.confidence * 100)}٪
              </span>
            </div>

            <dl className="divide-y divide-brand/10 px-4">
              <Row label="العنوان">
                {editing ? (
                  <input
                    value={draft.title}
                    onChange={(e) =>
                      setResult({ ...result, draft: { ...draft, title: e.target.value } })
                    }
                    className="field h-9 text-sm"
                  />
                ) : (
                  <span className="font-semibold">{draft.title}</span>
                )}
              </Row>

              <Row label="التاريخ">
                {editing ? (
                  <input
                    type="date"
                    value={draft.date ?? ''}
                    onChange={(e) =>
                      setResult({ ...result, draft: { ...draft, date: e.target.value || null } })
                    }
                    className="field h-9 text-sm"
                  />
                ) : draft.date ? (
                  formatKeyFull(draft.date)
                ) : (
                  <span className="text-warning">غير محدد</span>
                )}
              </Row>

              <Row label="الوقت">
                {editing ? (
                  <input
                    type="time"
                    value={draft.time ?? ''}
                    onChange={(e) =>
                      setResult({ ...result, draft: { ...draft, time: e.target.value || null } })
                    }
                    className="field h-9 text-sm"
                  />
                ) : draft.time ? (
                  <span className="num">{draft.time}</span>
                ) : (
                  <span className="text-warning">غير محدد</span>
                )}
              </Row>

              {result.intent === 'create_task' && (
                <Row label="الأولوية">
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold ring-1 ring-inset', PRIORITY_MAP[draft.priority].chip)}>
                    {PRIORITY_MAP[draft.priority].label}
                  </span>
                </Row>
              )}

              <Row label="التذكير">
                {draft.reminderOffsets.length
                  ? draft.reminderOffsets.map((offset) => reminderLabel(offset)).join('، ')
                  : 'بدون تذكير'}
              </Row>

              {draft.recurrence && <Row label="التكرار">{describeRule(draft.recurrence)}</Row>}
              {draft.categoryName && <Row label="التصنيف">{draft.categoryName}</Row>}
              {draft.durationMin && <Row label="المدة">{draft.durationMin} دقيقة</Row>}
            </dl>

            <div className="flex flex-col gap-2 border-t border-brand/15 p-4 sm:flex-row">
              <Button
                onClick={create}
                loading={creating}
                icon={<Check className="h-4 w-4" />}
                className="flex-1"
                disabled={!draft.title || (!draft.date && result.intent !== 'create_habit')}
              >
                إنشاء
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditing((v) => !v)}
                icon={<Pencil className="h-4 w-4" />}
                className="flex-1"
              >
                {editing ? 'تم التعديل' : 'تعديل'}
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-[11px] text-faint">
          {provider === 'local'
            ? 'يعمل حاليًا بمحلّل عربي داخلي — بلا مفاتيح ولا اتصال خارجي.'
            : `يعمل عبر مزوّد ${provider}.`}{' '}
          {categories.length > 0 && `التصنيفات المتاحة: ${categories.length}.`}
        </p>
      </div>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <dt className="shrink-0 text-[13px] text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-left text-[14px]">{children}</dd>
    </div>
  );
}

/* أنواع مبسّطة لواجهة التعرّف على الكلام (غير موجودة في lib.dom الافتراضية) */
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  start(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
}
