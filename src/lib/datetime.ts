import { MONTHS_AR, WEEKDAYS_AR, WEEKDAYS_SHORT_AR } from './constants';

/**
 * أدوات التاريخ والوقت مع دعم كامل للمناطق الزمنية.
 * ---------------------------------------------------------------------------
 * القاعدة الذهبية في المشروع:
 *   • كل ما يُخزَّن في قاعدة البيانات = UTC بصيغة ISO-8601.
 *   • كل ما يُعرض للمستخدم = محوَّل إلى منطقته الزمنية.
 *   • مفاتيح الأيام (YYYY-MM-DD) تُحسب دائماً بتوقيت المستخدم.
 * تعتمد على Intl فقط، بلا مكتبات مناطق زمنية ثقيلة.
 */

export const DEFAULT_TZ = 'Asia/Riyadh';

const partsCache = new Map<string, Intl.DateTimeFormat>();

function formatter(tz: string): Intl.DateTimeFormat {
  let f = partsCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    partsCache.set(tz, f);
  }
  return f;
}

interface WallParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** أجزاء الوقت الجداري (wall clock) لتاريخ ما داخل منطقة زمنية */
export function wallParts(date: Date, tz: string = DEFAULT_TZ): WallParts {
  const p = formatter(tz).formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? '0');
  const hour = get('hour');
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  };
}

/** إزاحة المنطقة الزمنية بالمللي ثانية عند لحظة معينة (تراعي التوقيت الصيفي) */
export function tzOffsetMs(date: Date, tz: string = DEFAULT_TZ): number {
  const w = wallParts(date, tz);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * تحويل وقت جداري في منطقة المستخدم إلى UTC.
 * @param dateStr YYYY-MM-DD
 * @param timeStr HH:mm (اختياري، افتراضياً 00:00)
 */
export function zonedToUtc(dateStr: string, timeStr: string | null, tz: string = DEFAULT_TZ): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = (timeStr ?? '00:00').split(':').map(Number);
  const naive = Date.UTC(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  // تقريب أولي ثم تصحيح — يعالج حالات التوقيت الصيفي بدقة
  let guess = new Date(naive - tzOffsetMs(new Date(naive), tz));
  guess = new Date(naive - tzOffsetMs(guess, tz));
  return guess;
}

/** مفتاح اليوم YYYY-MM-DD بتوقيت المستخدم */
export function dayKey(date: Date | string, tz: string = DEFAULT_TZ): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const w = wallParts(d, tz);
  return `${w.year}-${pad(w.month)}-${pad(w.day)}`;
}

/** اليوم الحالي بتوقيت المستخدم */
export function todayKey(tz: string = DEFAULT_TZ): string {
  return dayKey(new Date(), tz);
}

/** بداية ونهاية يوم بتوقيت المستخدم، بصيغة UTC ISO */
export function dayRangeUtc(dateKey: string, tz: string = DEFAULT_TZ): { from: string; to: string } {
  const from = zonedToUtc(dateKey, '00:00', tz);
  const next = addDaysKey(dateKey, 1);
  const to = zonedToUtc(next, '00:00', tz);
  return { from: from.toISOString(), to: to.toISOString() };
}

/** إضافة أيام إلى مفتاح يوم (يعمل على التقويم الميلادي مباشرة) */
export function addDaysKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}

/** رقم يوم الأسبوع لمفتاح يوم (0 = الأحد) */
export function weekdayOfKey(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** الفرق بالأيام بين مفتاحي يوم */
export function diffDaysKeys(a: string, b: string): number {
  const toMs = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((toMs(a) - toMs(b)) / 86_400_000);
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

// ------------------------------- التنسيق ---------------------------------

/** الوقت بصيغة 12 أو 24 ساعة بالعربية */
export function formatTime(
  date: Date | string,
  tz: string = DEFAULT_TZ,
  format: '12' | '24' = '12',
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const w = wallParts(d, tz);
  if (format === '24') return `${pad(w.hour)}:${pad(w.minute)}`;
  const suffix = w.hour < 12 ? 'ص' : 'م';
  const h12 = w.hour % 12 === 0 ? 12 : w.hour % 12;
  return `${h12}:${pad(w.minute)} ${suffix}`;
}

/** تاريخ مختصر: ١٥ أغسطس */
export function formatDateShort(date: Date | string, tz: string = DEFAULT_TZ): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const w = wallParts(d, tz);
  return `${w.day} ${MONTHS_AR[w.month - 1]}`;
}

/** تاريخ كامل: الخميس، ١٥ أغسطس ٢٠٢٦ */
export function formatDateFull(date: Date | string, tz: string = DEFAULT_TZ): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const w = wallParts(d, tz);
  const wd = WEEKDAYS_AR[new Date(Date.UTC(w.year, w.month - 1, w.day)).getUTCDay()];
  return `${wd}، ${w.day} ${MONTHS_AR[w.month - 1]} ${w.year}`;
}

export function formatKeyFull(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const wd = WEEKDAYS_AR[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${wd}، ${d} ${MONTHS_AR[m - 1]} ${y}`;
}

export function formatKeyShort(key: string): string {
  const [, m, d] = key.split('-').map(Number);
  return `${d} ${MONTHS_AR[m - 1]}`;
}

export function weekdayShort(key: string): string {
  return WEEKDAYS_SHORT_AR[weekdayOfKey(key)];
}

/** وصف نسبي: اليوم / غدًا / أمس / بعد ٣ أيام / قبل يومين */
export function relativeDayLabel(dateKey: string, tz: string = DEFAULT_TZ): string {
  const diff = diffDaysKeys(dateKey, todayKey(tz));
  if (diff === 0) return 'اليوم';
  if (diff === 1) return 'غدًا';
  if (diff === -1) return 'أمس';
  if (diff === 2) return 'بعد يومين';
  if (diff === -2) return 'قبل يومين';
  if (diff > 2 && diff <= 7) return `بعد ${diff} أيام`;
  if (diff < -2 && diff >= -7) return `قبل ${Math.abs(diff)} أيام`;
  return formatKeyShort(dateKey);
}

/** عدّاد تنازلي مقروء: بعد ١٥ دقيقة / بعد ساعتين / متأخرة ٣ أيام */
export function humanizeUntil(target: Date | string, now: Date = new Date()): string {
  const t = typeof target === 'string' ? new Date(target) : target;
  const ms = t.getTime() - now.getTime();
  const abs = Math.abs(ms);
  const mins = Math.round(abs / 60000);
  const hours = Math.round(abs / 3_600_000);
  const days = Math.round(abs / 86_400_000);
  const late = ms < 0;
  let value: string;
  if (mins < 1) value = 'أقل من دقيقة';
  else if (mins < 60) value = `${mins} دقيقة`;
  else if (hours < 24) value = hours === 1 ? 'ساعة' : hours === 2 ? 'ساعتين' : `${hours} ساعات`;
  else value = days === 1 ? 'يوم' : days === 2 ? 'يومين' : `${days} يومًا`;
  return late ? `متأخرة ${value}` : `بعد ${value}`;
}

/** صياغة عربية سليمة: مفرد ومثنى وجمع القِلّة والكثرة */
function arabicCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n >= 3 && n <= 10) return `${n} ${few}`;
  return `${n} ${many}`;
}

/** تحويل دقائق التذكير إلى نص */
export function reminderLabel(minutes: number): string {
  if (minutes === 0) return 'في وقت المهمة';
  if (minutes < 60) return `قبل ${arabicCount(minutes, 'دقيقة', 'دقيقتين', 'دقائق', 'دقيقة')}`;
  if (minutes < 1440) {
    const h = minutes / 60;
    if (!Number.isInteger(h)) return `قبل ${minutes} دقيقة`;
    return `قبل ${arabicCount(h, 'ساعة', 'ساعتين', 'ساعات', 'ساعة')}`;
  }
  const d = minutes / 1440;
  if (!Number.isInteger(d)) return `قبل ${Math.round(minutes / 60)} ساعة`;
  if (d === 7) return 'قبل أسبوع';
  if (d === 14) return 'قبل أسبوعين';
  return `قبل ${arabicCount(d, 'يوم', 'يومين', 'أيام', 'يومًا')}`;
}

/** مدة بالدقائق إلى نص عربي */
export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} دقيقة`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hs = h === 1 ? 'ساعة' : h === 2 ? 'ساعتان' : `${h} ساعات`;
  return m ? `${hs} و${m} دقيقة` : hs;
}

/** تحية حسب وقت اليوم */
export function greeting(tz: string = DEFAULT_TZ): string {
  const h = wallParts(new Date(), tz).hour;
  if (h < 5) return 'ليلة هادئة';
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'نهارك سعيد';
  if (h < 21) return 'مساء الخير';
  return 'مساء الخير';
}

/** قيمة datetime-local لحقل الإدخال من ISO */
export function toInputDate(iso: string | null, tz: string = DEFAULT_TZ): string {
  if (!iso) return '';
  return dayKey(iso, tz);
}

export function toInputTime(iso: string | null, tz: string = DEFAULT_TZ): string {
  if (!iso) return '';
  const w = wallParts(new Date(iso), tz);
  return `${pad(w.hour)}:${pad(w.minute)}`;
}

/** كل أيام شهر معيّن كشبكة تقويم (٦ أسابيع) */
export function monthGrid(year: number, month: number, weekStartsOn = 0): string[] {
  const first = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = first.getUTCDay();
  const lead = (startWeekday - weekStartsOn + 7) % 7;
  const start = new Date(first);
  start.setUTCDate(start.getUTCDate() - lead);
  const out: string[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    out.push(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`);
  }
  return out;
}

/** أيام أسبوع يحتوي مفتاح اليوم المعطى */
export function weekOf(key: string, weekStartsOn = 0): string[] {
  const wd = weekdayOfKey(key);
  const back = (wd - weekStartsOn + 7) % 7;
  const start = addDaysKey(key, -back);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(start, i));
}

/** المنطقة الزمنية للمتصفح */
export function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
  } catch {
    return DEFAULT_TZ;
  }
}
