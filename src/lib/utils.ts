import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** أرقام عربية-هندية للعرض التسويقي فقط */
export function toArabicDigits(input: string | number): string {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return String(input).replace(/\d/g, (d) => map[Number(d)]);
}

/** صياغة النسبة المئوية */
export function pct(value: number, total: number): number {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

/** الحروف الأولى من الاسم للصورة الرمزية */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '؟';
  if (parts.length === 1) return parts[0].slice(0, 2);
  return parts[0][0] + parts[1][0];
}

/** تأخير بسيط */
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** إزالة التشكيل وتوحيد الهمزات للبحث العربي */
export function normalizeArabic(text: string): string {
  return text
    .replace(/[ً-ٰٟ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ـ/g, '')
    .toLowerCase()
    .trim();
}

/** تقصير النص مع نقاط */
export function truncate(text: string, max = 80): string {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} بايت`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} كيلوبايت`;
  return `${(bytes / 1024 / 1024).toFixed(1)} ميجابايت`;
}

/** تجميع عناصر حسب مفتاح */
export function groupBy<T, K extends string | number>(items: T[], key: (item: T) => K) {
  return items.reduce(
    (acc, item) => {
      const k = key(item);
      (acc[k] ||= []).push(item);
      return acc;
    },
    {} as Record<K, T[]>,
  );
}
