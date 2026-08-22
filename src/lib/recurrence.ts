import type { RecurrenceRule } from './types';
import { addDaysKey, diffDaysKeys, weekdayOfKey, WEEKDAY_LABEL_HELPER } from './recurrence-helpers';

/**
 * محرّك التكرار
 * ---------------------------------------------------------------------------
 * قاعدة بسيطة ومفهومة بدل RRULE الكاملة: تكفي كل الحالات المطلوبة
 * (يوميًا، أيام محددة، أسبوعيًا، شهريًا، سنويًا، كل X أيام/أسابيع/أشهر)
 * وقابلة للتحويل إلى iCalendar RRULE لاحقاً عند الحاجة للتصدير.
 */

/** هل يقع هذا اليوم ضمن نمط التكرار؟ */
export function matchesRule(rule: RecurrenceRule, anchorKey: string, dayKeyValue: string): boolean {
  if (diffDaysKeys(dayKeyValue, anchorKey) < 0) return false;
  if (rule.until && diffDaysKeys(dayKeyValue, rule.until) > 0) return false;

  const interval = Math.max(1, rule.interval || 1);

  switch (rule.freq) {
    case 'daily': {
      const delta = diffDaysKeys(dayKeyValue, anchorKey);
      return delta % interval === 0;
    }
    case 'weekly': {
      const days = rule.byWeekday?.length ? rule.byWeekday : [weekdayOfKey(anchorKey)];
      if (!days.includes(weekdayOfKey(dayKeyValue))) return false;
      if (interval === 1) return true;
      // نقارن رقم الأسبوع نسبةً إلى أسبوع نقطة البداية
      const weeks = Math.floor(diffDaysKeys(dayKeyValue, startOfWeekKey(anchorKey)) / 7);
      return weeks % interval === 0;
    }
    case 'monthly': {
      const [ay, am, ad] = anchorKey.split('-').map(Number);
      const [dy, dm, dd] = dayKeyValue.split('-').map(Number);
      if (dd !== ad) return false;
      const months = (dy - ay) * 12 + (dm - am);
      return months >= 0 && months % interval === 0;
    }
    case 'yearly': {
      const [ay, am, ad] = anchorKey.split('-').map(Number);
      const [dy, dm, dd] = dayKeyValue.split('-').map(Number);
      if (dm !== am || dd !== ad) return false;
      return (dy - ay) % interval === 0;
    }
    default:
      return false;
  }
}

function startOfWeekKey(key: string): string {
  return addDaysKey(key, -weekdayOfKey(key));
}

/** توليد مفاتيح الأيام التي يتكرر فيها العنصر ضمن نطاق */
export function expandRule(
  rule: RecurrenceRule,
  anchorKey: string,
  fromKey: string,
  toKey: string,
  limit = 400,
): string[] {
  const out: string[] = [];
  let cursor = diffDaysKeys(fromKey, anchorKey) < 0 ? anchorKey : fromKey;
  let guard = 0;
  let produced = 0;
  while (diffDaysKeys(cursor, toKey) <= 0 && guard < limit * 4) {
    guard++;
    if (matchesRule(rule, anchorKey, cursor)) {
      out.push(cursor);
      produced++;
      if (rule.count && produced >= rule.count) break;
      if (out.length >= limit) break;
    }
    cursor = addDaysKey(cursor, 1);
  }
  return out;
}

/** وصف عربي مقروء لقاعدة التكرار */
export function describeRule(rule: RecurrenceRule | null): string {
  if (!rule) return 'لا يتكرر';
  const n = Math.max(1, rule.interval || 1);
  const until = rule.until ? ` حتى ${rule.until}` : '';
  switch (rule.freq) {
    case 'daily':
      return (n === 1 ? 'يوميًا' : n === 2 ? 'كل يومين' : `كل ${n} أيام`) + until;
    case 'weekly': {
      if (rule.byWeekday?.length) {
        const names = rule.byWeekday.map((d) => WEEKDAY_LABEL_HELPER[d]).join('، ');
        const every = n === 1 ? '' : n === 2 ? ' (كل أسبوعين)' : ` (كل ${n} أسابيع)`;
        return `كل ${names}${every}${until}`;
      }
      return (n === 1 ? 'أسبوعيًا' : n === 2 ? 'كل أسبوعين' : `كل ${n} أسابيع`) + until;
    }
    case 'monthly':
      return (n === 1 ? 'شهريًا' : n === 2 ? 'كل شهرين' : `كل ${n} أشهر`) + until;
    case 'yearly':
      return (n === 1 ? 'سنويًا' : `كل ${n} سنوات`) + until;
    default:
      return 'لا يتكرر';
  }
}

/** تحويل القاعدة إلى RRULE قياسية (للتصدير المستقبلي إلى iCalendar) */
export function toRRule(rule: RecurrenceRule): string {
  const parts = [`FREQ=${rule.freq.toUpperCase()}`, `INTERVAL=${Math.max(1, rule.interval || 1)}`];
  if (rule.byWeekday?.length) {
    const map = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
    parts.push(`BYDAY=${rule.byWeekday.map((d) => map[d]).join(',')}`);
  }
  if (rule.until) parts.push(`UNTIL=${rule.until.replace(/-/g, '')}T235959Z`);
  if (rule.count) parts.push(`COUNT=${rule.count}`);
  return parts.join(';');
}

export function parseRule(json: string | null): RecurrenceRule | null {
  if (!json) return null;
  try {
    const parsed = JSON.parse(json) as RecurrenceRule;
    if (!parsed?.freq) return null;
    return { ...parsed, interval: parsed.interval || 1 };
  } catch {
    return null;
  }
}
