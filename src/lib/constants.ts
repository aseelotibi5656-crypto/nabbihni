import type { Priority } from './types';

export const APP_NAME = 'نَبّهني';
export const APP_TAGLINE = 'لا تنسَ شيئًا بعد اليوم.';
export const APP_DESCRIPTION =
  'نَبّهني يساعدك على تنظيم مهامك ومواعيدك وعاداتك، ويذكّرك بها في الوقت المناسب.';
export const CREDIT_NAME = 'otbAseel';
/** ضع هنا الرابط الرسمي عند توفره ليتحول الاسم في التذييل إلى رابط تلقائياً */
export const CREDIT_URL: string | null = null;

export const PRIORITIES: {
  value: Priority;
  label: string;
  color: string;
  dot: string;
  chip: string;
}[] = [
  {
    value: 'low',
    label: 'منخفضة',
    color: 'sky',
    dot: 'bg-sky-500',
    chip: 'bg-sky-500/10 text-sky-700 dark:text-sky-300 ring-sky-500/20',
  },
  {
    value: 'medium',
    label: 'متوسطة',
    color: 'amber',
    dot: 'bg-amber-500',
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 ring-amber-500/20',
  },
  {
    value: 'high',
    label: 'عالية',
    color: 'orange',
    dot: 'bg-orange-500',
    chip: 'bg-orange-500/10 text-orange-700 dark:text-orange-300 ring-orange-500/20',
  },
  {
    value: 'urgent',
    label: 'عاجلة',
    color: 'rose',
    dot: 'bg-rose-500',
    chip: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 ring-rose-500/20',
  },
];

export const PRIORITY_MAP = Object.fromEntries(PRIORITIES.map((p) => [p.value, p])) as Record<
  Priority,
  (typeof PRIORITIES)[number]
>;

/**
 * خيارات التذكير الجاهزة (بالدقائق قبل الموعد).
 * النصوص تُشتق من reminderLabel في مكان العرض حتى تبقى الصياغة موحّدة
 * في كل التطبيق (نافذة المهمة، الإعدادات، المساعد الذكي).
 */
export const REMINDER_PRESETS = [0, 5, 10, 15, 30, 60, 120, 1440, 2880, 10080].map((value) => ({
  value,
}));

export const DEFAULT_CATEGORIES = [
  { name: 'شخصي', color: 'violet', icon: 'user' },
  { name: 'العمل', color: 'blue', icon: 'briefcase' },
  { name: 'الدراسة', color: 'indigo', icon: 'graduation-cap' },
  { name: 'الصحة', color: 'emerald', icon: 'heart-pulse' },
  { name: 'المالية', color: 'amber', icon: 'wallet' },
  { name: 'العائلة', color: 'pink', icon: 'users' },
  { name: 'مهم', color: 'rose', icon: 'flag' },
];

/** ألوان التصنيفات — أصناف Tailwind ثابتة حتى لا تُحذف عند التجميع */
export const COLOR_CLASSES: Record<string, { bg: string; text: string; ring: string; solid: string; soft: string }> = {
  indigo: { bg: 'bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-300', ring: 'ring-indigo-500/25', solid: 'bg-indigo-500', soft: 'bg-indigo-500/15' },
  violet: { bg: 'bg-violet-500/10', text: 'text-violet-600 dark:text-violet-300', ring: 'ring-violet-500/25', solid: 'bg-violet-500', soft: 'bg-violet-500/15' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-300', ring: 'ring-blue-500/25', solid: 'bg-blue-500', soft: 'bg-blue-500/15' },
  sky: { bg: 'bg-sky-500/10', text: 'text-sky-600 dark:text-sky-300', ring: 'ring-sky-500/25', solid: 'bg-sky-500', soft: 'bg-sky-500/15' },
  cyan: { bg: 'bg-cyan-500/10', text: 'text-cyan-600 dark:text-cyan-300', ring: 'ring-cyan-500/25', solid: 'bg-cyan-500', soft: 'bg-cyan-500/15' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-600 dark:text-teal-300', ring: 'ring-teal-500/25', solid: 'bg-teal-500', soft: 'bg-teal-500/15' },
  emerald: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-300', ring: 'ring-emerald-500/25', solid: 'bg-emerald-500', soft: 'bg-emerald-500/15' },
  lime: { bg: 'bg-lime-500/10', text: 'text-lime-600 dark:text-lime-300', ring: 'ring-lime-500/25', solid: 'bg-lime-500', soft: 'bg-lime-500/15' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-300', ring: 'ring-amber-500/25', solid: 'bg-amber-500', soft: 'bg-amber-500/15' },
  orange: { bg: 'bg-orange-500/10', text: 'text-orange-600 dark:text-orange-300', ring: 'ring-orange-500/25', solid: 'bg-orange-500', soft: 'bg-orange-500/15' },
  rose: { bg: 'bg-rose-500/10', text: 'text-rose-600 dark:text-rose-300', ring: 'ring-rose-500/25', solid: 'bg-rose-500', soft: 'bg-rose-500/15' },
  pink: { bg: 'bg-pink-500/10', text: 'text-pink-600 dark:text-pink-300', ring: 'ring-pink-500/25', solid: 'bg-pink-500', soft: 'bg-pink-500/15' },
  slate: { bg: 'bg-slate-500/10', text: 'text-slate-600 dark:text-slate-300', ring: 'ring-slate-500/25', solid: 'bg-slate-500', soft: 'bg-slate-500/15' },
};

export const colorOf = (c?: string | null) => COLOR_CLASSES[c ?? 'indigo'] ?? COLOR_CLASSES.indigo;

export const WEEKDAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
export const WEEKDAYS_SHORT_AR = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
export const MONTHS_AR = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
];

export const HABIT_ICONS = [
  'sparkles', 'book-open', 'dumbbell', 'droplets', 'moon', 'sun', 'brain',
  'heart', 'footprints', 'pen-line', 'music', 'leaf',
];

export const TIMEZONES = [
  'Asia/Riyadh', 'Asia/Dubai', 'Asia/Kuwait', 'Asia/Qatar', 'Asia/Bahrain',
  'Asia/Muscat', 'Asia/Amman', 'Asia/Beirut', 'Asia/Baghdad', 'Africa/Cairo',
  'Africa/Khartoum', 'Africa/Casablanca', 'Africa/Tunis', 'Africa/Algiers',
  'Europe/London', 'Europe/Paris', 'Europe/Istanbul', 'America/New_York',
  'America/Los_Angeles', 'UTC',
];

export const PLANS = [
  {
    id: 'free' as const,
    name: 'المجانية',
    price: '٠',
    period: 'دائمًا',
    description: 'كل ما تحتاجه لتنظيم يومك.',
    features: ['مهام ومواعيد بلا حدود', 'تذكيرات فورية', 'حتى ٥ عادات', 'تقويم كامل', 'إحصائيات أساسية'],
    cta: 'ابدأ مجانًا',
    highlighted: false,
  },
  {
    id: 'pro' as const,
    name: 'الاحترافية',
    price: '١٩',
    period: 'ريال / شهريًا',
    description: 'للمنتجين الجادّين في تنظيم وقتهم.',
    features: ['كل مزايا المجانية', 'عادات غير محدودة', 'المساعد الذكي بلا حدود', 'إحصائيات متقدمة', 'إعادة جدولة ذكية', 'مرفقات وملاحظات'],
    cta: 'جرّب الاحترافية',
    highlighted: true,
  },
  {
    id: 'business' as const,
    name: 'الأعمال',
    price: '٤٩',
    period: 'ريال / لكل عضو',
    description: 'للفرق والعائلات التي تنظّم معًا.',
    features: ['كل مزايا الاحترافية', 'مساحات عمل مشتركة', 'قوائم ومهام مشتركة', 'صلاحيات الأعضاء', 'تقويم مشترك', 'دعم ذو أولوية'],
    cta: 'تواصل معنا',
    highlighted: false,
  },
];
