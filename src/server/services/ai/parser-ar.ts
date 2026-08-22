import type { AiParseResult, Priority, RecurrenceRule } from '@/lib/types';
import { addDaysKey, weekdayOfKey } from '@/lib/recurrence-helpers';
import { todayKey } from '@/lib/datetime';

/**
 * محلّل اللغة الطبيعية العربية (المزوّد المحلي)
 * ---------------------------------------------------------------------------
 * يحوّل جملة مثل: «ذكرني أذاكر الفصل الثالث يوم الخميس الساعة ٧ مساءً»
 * إلى مسودّة مهمة كاملة (عنوان + تاريخ + وقت + تذكير).
 *
 * لماذا محلّل قواعدي وليس نموذجاً لغوياً؟
 *  • يعمل فوراً بلا مفاتيح ولا تكلفة ولا زمن انتظار.
 *  • نتائجه قابلة للتنبؤ والاختبار.
 *  • عند توفير مفتاح مزوّد LLM يتم استبداله تلقائياً (انظر index.ts)
 *    دون تغيير أي شيء في الواجهة أو الـ API.
 */

const AR_DIGITS = /[٠-٩]/g;
const normalizeDigits = (s: string) =>
  s.replace(AR_DIGITS, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

const WEEKDAY_WORDS: Record<string, number> = {
  الاحد: 0, احد: 0, الأحد: 0, أحد: 0,
  الاثنين: 1, اثنين: 1, الإثنين: 1, الاتنين: 1,
  الثلاثاء: 2, ثلاثاء: 2, الثلثاء: 2,
  الاربعاء: 3, اربعاء: 3, الأربعاء: 3,
  الخميس: 4, خميس: 4,
  الجمعة: 5, جمعة: 5,
  السبت: 6, سبت: 6,
};

const MONTH_WORDS: Record<string, number> = {
  يناير: 1, فبراير: 2, مارس: 3, ابريل: 4, أبريل: 4, مايو: 5, يونيو: 6,
  يوليو: 7, اغسطس: 8, أغسطس: 8, سبتمبر: 9, اكتوبر: 10, أكتوبر: 10,
  نوفمبر: 11, ديسمبر: 12,
};

const NUMBER_WORDS: Record<string, number> = {
  وحده: 1, واحده: 1, الواحده: 1, واحدة: 1,
  ثنتين: 2, اثنتين: 2, الثانيه: 2, الثانية: 2, ثانيه: 2,
  ثلاث: 3, الثالثه: 3, الثالثة: 3, تلاته: 3,
  اربع: 4, أربع: 4, الرابعه: 4, الرابعة: 4,
  خمس: 5, الخامسه: 5, الخامسة: 5,
  ست: 6, السادسه: 6, السادسة: 6,
  سبع: 7, السابعه: 7, السابعة: 7,
  ثمان: 8, ثمانيه: 8, الثامنه: 8, الثامنة: 8,
  تسع: 9, التاسعه: 9, التاسعة: 9,
  عشر: 10, العاشره: 10, العاشرة: 10,
  احدعشر: 11, الحاديه: 11,
  اثناعشر: 12, الثانيهعشره: 12,
};

/** توحيد النص العربي للمطابقة */
function normalize(text: string): string {
  return normalizeDigits(text)
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ـ/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * أدوات الطلب التي تُحذف من العنوان.
 * لا نضع هنا كلمات المحتوى مثل «اجتماع» أو «محاضرة» لأنها جزء أصيل
 * من اسم المهمة («اجتماع الفريق» وليس «الفريق»).
 */
const TRIGGER_WORDS = [
  'ذكرني', 'ذكريني', 'نبهني', 'نبّهني', 'تذكير', 'ذكرنى', 'رجاء ذكرني',
  'اضف', 'أضف', 'اضيف', 'ضيف', 'سجل', 'انشئ', 'أنشئ', 'اعمل', 'سوي',
  'عندي', 'لدي', 'بدي', 'ابغى', 'ابي', 'اريد', 'أريد', 'محتاج',
];

const PRIORITY_WORDS: { words: string[]; value: Priority }[] = [
  { words: ['عاجل', 'عاجله', 'ضروري جدا', 'طارئ', 'مستعجل'], value: 'urgent' },
  { words: ['مهم', 'مهمه جدا', 'ضروري', 'اولويه عاليه'], value: 'high' },
  { words: ['بسيط', 'غير مستعجل', 'اذا فضيت', 'وقت فراغ'], value: 'low' },
];

const CATEGORY_HINTS: { words: string[]; category: string }[] = [
  { words: ['محاضره', 'محاضرة', 'مذاكره', 'اذاكر', 'ذاكر', 'دراسه', 'اختبار', 'امتحان', 'واجب', 'فصل', 'مراجعه'], category: 'الدراسة' },
  { words: ['اجتماع', 'شغل', 'عمل', 'مشروع', 'عميل', 'تقرير', 'مقابله'], category: 'العمل' },
  { words: ['رياضه', 'نادي', 'جيم', 'مشي', 'دكتور', 'طبيب', 'صيدليه', 'دواء', 'نوم', 'ماء'], category: 'الصحة' },
  { words: ['فاتوره', 'فاتورة', 'دفع', 'راتب', 'بنك', 'تحويل', 'اشتراك'], category: 'المالية' },
  { words: ['امي', 'ابوي', 'العايله', 'العائله', 'زياره', 'عزيمه'], category: 'العائلة' },
];

interface TimeMatch {
  time: string | null;
  consumed: string[];
}

/** استخراج الوقت: «الساعة ٧ مساءً»، «7:30 م»، «الظهر»، «بعد ساعتين» */
function extractTime(text: string): TimeMatch {
  const consumed: string[] = [];

  // صيغة رقمية صريحة 7:30 أو 19:00
  const explicit = text.match(
    /(?:الساعه\s*)?(\d{1,2}):(\d{2})\s*(صباحا|صباح|مساءا|مساء|ظهرا|ظهر|عصرا|عصر|ليلا|ليل|ص|م)?/,
  );
  if (explicit) {
    let hour = Number(explicit[1]);
    const minute = Number(explicit[2]);
    const suffix = explicit[3];
    hour = applyMeridiem(hour, suffix, text);
    consumed.push(explicit[0]);
    return { time: `${pad(hour)}:${pad(minute)}`, consumed };
  }

  // «الساعة ٧ مساءً» أو «الساعة سبعة»
  const hourMatch = text.match(
    /(?:الساعه|ساعه|الساعة)\s*(\d{1,2}|[ا-ي]+)\s*(صباحا|صباح|مساءا|مساء|ظهرا|ظهر|عصرا|عصر|ليلا|ليل|ص|م)?/,
  );
  if (hourMatch) {
    const raw = hourMatch[1];
    let hour = /^\d+$/.test(raw) ? Number(raw) : (NUMBER_WORDS[raw] ?? NaN);
    if (!Number.isNaN(hour)) {
      hour = applyMeridiem(hour, hourMatch[2], text);
      consumed.push(hourMatch[0]);
      return { time: `${pad(hour)}:00`, consumed };
    }
  }

  // «٨ صباحًا» أو «٧ مساء» بدون كلمة «الساعة»
  const bare = text.match(
    /(?:^|\s)(\d{1,2})\s*(صباحا|صباح|مساءا|مساء|ظهرا|ظهر|عصرا|عصر|ليلا|ليل)(?=\s|$)/,
  );
  if (bare) {
    const hour = applyMeridiem(Number(bare[1]), bare[2], text);
    consumed.push(bare[0].trim());
    return { time: `${pad(hour)}:00`, consumed };
  }

  // أوقات وصفية
  const named: [RegExp, string][] = [
    [/الفجر/, '05:00'],
    [/الصبح|صباحا(?!\s*\d)|الصباح/, '08:00'],
    [/الظهر|الظهيره/, '12:30'],
    [/العصر/, '16:00'],
    [/المغرب/, '18:30'],
    [/العشاء|المسا|المساء/, '20:00'],
    [/منتصف الليل/, '00:00'],
  ];
  for (const [pattern, value] of named) {
    const m = text.match(pattern);
    if (m) {
      consumed.push(m[0]);
      return { time: value, consumed };
    }
  }

  return { time: null, consumed };
}

function applyMeridiem(hour: number, suffix: string | undefined, fullText: string): number {
  const pm =
    /^(م|مساء|مساءا|ظهرا|ظهر|عصرا|عصر|ليلا|ليل)$/.test(suffix ?? '') ||
    /مساء|المسا|بالليل|العصر/.test(fullText);
  const am = /^(ص|صباحا|صباح)$/.test(suffix ?? '') || /صباحا|الصبح|بالصباح/.test(fullText);
  if (pm && hour < 12) return hour + 12;
  if (am && hour === 12) return 0;
  if (!pm && !am && hour >= 1 && hour <= 6) return hour + 12; // ٥ يعني غالباً مساءً
  return hour;
}

interface DateMatch {
  date: string | null;
  recurrence: RecurrenceRule | null;
  consumed: string[];
}

/** استخراج التاريخ والتكرار */
function extractDate(text: string, tz: string): DateMatch {
  const today = todayKey(tz);
  const consumed: string[] = [];

  // ---- التكرار ----
  const recurrence = extractRecurrence(text, consumed);
  if (recurrence) {
    // أول يوم مطابق للتكرار
    let cursor = today;
    for (let i = 0; i < 370; i++) {
      if (recurrence.freq !== 'weekly' || !recurrence.byWeekday?.length) break;
      if (recurrence.byWeekday.includes(weekdayOfKey(cursor))) break;
      cursor = addDaysKey(cursor, 1);
    }
    return { date: cursor, recurrence, consumed };
  }

  // ---- كلمات نسبية ----
  const relatives: [RegExp, number][] = [
    [/بعد بكره|بعد بكرة|بعد غد|بعد يومين/, 2],
    [/اليوم|اليومك/, 0],
    [/بكره|بكرة|غدا|غد(?!\s*ا)/, 1],
    [/بعد اسبوع/, 7],
    [/بعد اسبوعين/, 14],
    [/بعد شهر/, 30],
    [/بعد سنه|بعد سنة/, 365],
  ];
  for (const [pattern, offset] of relatives) {
    const m = text.match(pattern);
    if (m) {
      consumed.push(m[0]);
      return { date: addDaysKey(today, offset), recurrence: null, consumed };
    }
  }

  const afterDays = text.match(/بعد\s*(\d{1,3})\s*(يوم|ايام|أيام)/);
  if (afterDays) {
    consumed.push(afterDays[0]);
    return { date: addDaysKey(today, Number(afterDays[1])), recurrence: null, consumed };
  }

  // ---- يوم أسبوع محدد: «يوم الخميس» / «الخميس الجاي» ----
  const weekdayMatch = text.match(/(?:يوم\s*)?(الاحد|الأحد|احد|الاثنين|الإثنين|اثنين|الثلاثاء|ثلاثاء|الاربعاء|الأربعاء|اربعاء|الخميس|خميس|الجمعه|الجمعة|جمعه|السبت|سبت)(\s*(الجاي|القادم|الجايه|القادمه))?/);
  if (weekdayMatch) {
    const target = WEEKDAY_WORDS[weekdayMatch[1]] ?? WEEKDAY_WORDS[normalize(weekdayMatch[1])];
    if (target !== undefined) {
      consumed.push(weekdayMatch[0]);
      let cursor = today;
      const forceNext = Boolean(weekdayMatch[2]);
      if (forceNext || weekdayOfKey(cursor) === target) cursor = addDaysKey(cursor, 1);
      for (let i = 0; i < 8; i++) {
        if (weekdayOfKey(cursor) === target) break;
        cursor = addDaysKey(cursor, 1);
      }
      return { date: cursor, recurrence: null, consumed };
    }
  }

  // ---- تاريخ صريح: «١٥ أغسطس» أو «15/8» ----
  const dayMonth = text.match(/(\d{1,2})\s*(يناير|فبراير|مارس|ابريل|أبريل|مايو|يونيو|يوليو|اغسطس|أغسطس|سبتمبر|اكتوبر|أكتوبر|نوفمبر|ديسمبر)/);
  if (dayMonth) {
    const day = Number(dayMonth[1]);
    const month = MONTH_WORDS[dayMonth[2]] ?? MONTH_WORDS[normalize(dayMonth[2])];
    if (month) {
      consumed.push(dayMonth[0]);
      const year = Number(today.slice(0, 4));
      let candidate = `${year}-${pad(month)}-${pad(day)}`;
      if (candidate < today) candidate = `${year + 1}-${pad(month)}-${pad(day)}`;
      return { date: candidate, recurrence: null, consumed };
    }
  }

  const numeric = text.match(/(\d{1,2})\s*[\/\-]\s*(\d{1,2})(?:\s*[\/\-]\s*(\d{4}))?/);
  if (numeric) {
    consumed.push(numeric[0]);
    const day = Number(numeric[1]);
    const month = Number(numeric[2]);
    const year = numeric[3] ? Number(numeric[3]) : Number(today.slice(0, 4));
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return { date: `${year}-${pad(month)}-${pad(day)}`, recurrence: null, consumed };
    }
  }

  return { date: null, recurrence: null, consumed };
}

function extractRecurrence(text: string, consumed: string[]): RecurrenceRule | null {
  // «كل أحد وثلاثاء وخميس»
  const everyWeekdays = text.match(/كل\s*((?:(?:يوم\s*)?(?:الاحد|احد|الاثنين|اثنين|الثلاثاء|ثلاثاء|الاربعاء|اربعاء|الخميس|خميس|الجمعه|جمعه|السبت|سبت)\s*(?:و\s*)?)+)/);
  if (everyWeekdays) {
    const days: number[] = [];
    for (const [word, index] of Object.entries(WEEKDAY_WORDS)) {
      if (everyWeekdays[1].includes(word) && !days.includes(index)) days.push(index);
    }
    if (days.length) {
      consumed.push(everyWeekdays[0]);
      return { freq: 'weekly', interval: 1, byWeekday: days.sort() };
    }
  }

  const patterns: [RegExp, () => RecurrenceRule][] = [
    [/كل يوم|يوميا|يوميًا/, () => ({ freq: 'daily', interval: 1 })],
    [/كل يومين/, () => ({ freq: 'daily', interval: 2 })],
    [/كل\s*(\d{1,2})\s*ايام/, () => ({ freq: 'daily', interval: 1 })],
    [/كل اسبوع|اسبوعيا/, () => ({ freq: 'weekly', interval: 1 })],
    [/كل اسبوعين/, () => ({ freq: 'weekly', interval: 2 })],
    [/كل شهر|شهريا/, () => ({ freq: 'monthly', interval: 1 })],
    [/كل شهرين/, () => ({ freq: 'monthly', interval: 2 })],
    [/كل سنه|كل سنة|سنويا/, () => ({ freq: 'yearly', interval: 1 })],
  ];
  for (const [pattern, build] of patterns) {
    const m = text.match(pattern);
    if (m) {
      consumed.push(m[0]);
      const rule = build();
      const numeric = m[1] ? Number(m[1]) : null;
      if (numeric && numeric > 1) rule.interval = numeric;
      return rule;
    }
  }
  return null;
}

/** استخراج مدة المهمة: «لمدة ساعة»، «نص ساعة» */
function extractDuration(text: string, consumed: string[]): number | null {
  const explicit = text.match(/(?:لمده|لمدة|مده|مدة)\s*(\d{1,3})\s*(دقيقه|دقيقة|د)/);
  if (explicit) {
    consumed.push(explicit[0]);
    return Number(explicit[1]);
  }
  const hours = text.match(/(?:لمده|لمدة|مده|مدة)?\s*(نص|نصف)\s*(ساعه|ساعة)/);
  if (hours) {
    consumed.push(hours[0]);
    return 30;
  }
  const fullHours = text.match(/(?:لمده|لمدة)\s*(ساعه|ساعة|ساعتين|(\d{1,2})\s*ساعات)/);
  if (fullHours) {
    consumed.push(fullHours[0]);
    if (/ساعتين/.test(fullHours[0])) return 120;
    if (fullHours[2]) return Number(fullHours[2]) * 60;
    return 60;
  }
  return null;
}

/** استخراج فترة التذكير المطلوبة صراحةً */
function extractReminder(text: string, consumed: string[]): number[] | null {
  const m = text.match(/(?:ذكرني|نبهني|تذكير)\s*قبل\s*(?:ب)?\s*(\d{1,3})?\s*(دقيقه|دقيقة|دقايق|ساعه|ساعة|ساعات|يوم|ايام)/);
  if (!m) return null;
  consumed.push(m[0]);
  const amount = m[1] ? Number(m[1]) : /ساعه|ساعة/.test(m[2]) ? 1 : /يوم/.test(m[2]) ? 1 : 10;
  if (/دقيق/.test(m[2])) return [amount];
  if (/ساع/.test(m[2])) return [amount * 60];
  return [amount * 1440];
}

const pad = (n: number) => String(n).padStart(2, '0');

/** كلمات وقت وصفية تبقى أحيانًا في العنوان بعد استخراج ساعة صريحة */
const LEFTOVER_TIME_WORDS =
  /(^|\s)(العصر|المساء|المسا|الصباح|الصبح|الظهر|الظهيره|الفجر|المغرب|العشاء|مساء|مساءا|صباحا|صباح|ظهرا|عصرا|ليلا|ص|م)(?=\s|$)/g;

/** تنظيف العنوان من الكلمات الوظيفية والأجزاء المستهلكة */
function buildTitle(original: string, consumedParts: string[], hasTime = false): string {
  let title = normalize(original);
  for (const part of consumedParts) {
    title = title.replace(part, ' ');
  }
  title = title
    .replace(new RegExp(`^(?:${TRIGGER_WORDS.map(normalize).join('|')})\\s*`, 'g'), '')
    .replace(/\b(ان|أن|اني|انني|ب|في|يوم|الساعه|عند|مع|على)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (hasTime) title = title.replace(LEFTOVER_TIME_WORDS, ' ').replace(/\s+/g, ' ').trim();
  title = title.replace(/(^|\s)\d{1,2}(?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();

  // إزالة أدوات البدء المتبقية
  for (const word of TRIGGER_WORDS.map(normalize)) {
    if (title.startsWith(word + ' ')) title = title.slice(word.length + 1);
  }
  return title.trim();
}

/** المحلّل الرئيسي */
export function parseArabic(input: string, tz: string, defaultOffsets: number[] = [10]): AiParseResult {
  const text = normalize(input);
  const consumed: string[] = [];

  const { time, consumed: timeConsumed } = extractTime(text);
  consumed.push(...timeConsumed);

  const { date, recurrence, consumed: dateConsumed } = extractDate(text, tz);
  consumed.push(...dateConsumed);

  const duration = extractDuration(text, consumed);
  const explicitReminder = extractReminder(text, consumed);

  let priority: Priority = 'medium';
  for (const entry of PRIORITY_WORDS) {
    const hit = entry.words.find((w) => text.includes(normalize(w)));
    if (hit) {
      priority = entry.value;
      // كلمة الأولوية ليست جزءًا من اسم المهمة
      consumed.push(normalize(hit));
      break;
    }
  }

  let categoryName: string | null = null;
  for (const hint of CATEGORY_HINTS) {
    if (hint.words.some((w) => text.includes(normalize(w)))) {
      categoryName = hint.category;
      break;
    }
  }

  const isEvent = /اجتماع|موعد|محاضره|مقابله|زياره|حفل|رحله|طيران/.test(text);
  const isHabit = Boolean(recurrence && /اقرا|قراءه|رياضه|مشي|ماء|نوم|ورد|اذكار|تعلم/.test(text));

  const title = buildTitle(input, consumed, Boolean(time)) || 'مهمة جديدة';

  const missing: string[] = [];
  if (!title || title.length < 2) missing.push('title');
  if (!date) missing.push('date');
  if (!time && !recurrence) missing.push('time');

  let clarification: string | null = null;
  if (missing.includes('title')) {
    clarification = 'ما اسم المهمة التي تريد تذكيرك بها؟';
  } else if (missing.includes('date') && missing.includes('time')) {
    clarification = `متى تريد أن أذكّرك بـ«${title}»؟ اكتب اليوم والوقت، مثل: غدًا الساعة ٧ مساءً.`;
  } else if (missing.includes('date')) {
    clarification = `في أي يوم تريد «${title}»؟`;
  } else if (missing.includes('time')) {
    clarification = `في أي ساعة تريد «${title}»؟`;
  }

  const confidence = Math.max(
    0.25,
    Math.min(0.98, 0.4 + (date ? 0.25 : 0) + (time ? 0.25 : 0) + (title.length > 3 ? 0.1 : 0)),
  );

  return {
    intent: isHabit ? 'create_habit' : isEvent ? 'create_event' : 'create_task',
    confidence: Number(confidence.toFixed(2)),
    missing,
    clarification,
    draft: {
      title,
      date,
      time,
      priority,
      categoryName,
      reminderOffsets: explicitReminder ?? (time ? defaultOffsets : [0]),
      durationMin: duration,
      recurrence,
      notes: null,
    },
    echo: input.trim(),
  };
}
