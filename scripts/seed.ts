/**
 * بيانات تجريبية واقعية — تجعل لوحة التحكم والإحصائيات تظهر بشكل حقيقي
 * منذ أول تشغيل. تُنشئ حساب تجربة كامل بمهامه ومواعيده وعاداته وسجلّها.
 *
 * الاستخدام: npm run db:seed
 * بيانات الدخول: demo@nabbihni.app / Demo12345
 */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';

const root = process.cwd();
const dbFile = process.env.DATABASE_FILE ?? path.join(root, 'data', 'nabbihni.db');
mkdirSync(path.dirname(dbFile), { recursive: true });

const db = new DatabaseSync(dbFile);
db.exec('PRAGMA foreign_keys = ON;');
db.exec(readFileSync(path.join(root, 'src', 'server', 'db', 'schema.sql'), 'utf8'));

const TZ = 'Asia/Riyadh';
const EMAIL = 'demo@nabbihni.app';
const PASSWORD = 'Demo12345';
const now = () => new Date().toISOString();

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';
function newId(prefix = '') {
  let rand = '';
  for (const b of randomBytes(10)) rand += ALPHABET[b % ALPHABET.length];
  return `${prefix}${Date.now().toString(36)}${rand}`;
}

/* ------------------------- أدوات التاريخ بتوقيت المستخدم ------------------------- */

function wall(date: Date) {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date);
  const get = (t: string) => Number(p.find((x) => x.type === t)?.value ?? '0');
  const hour = get('hour');
  return { y: get('year'), m: get('month'), d: get('day'), h: hour === 24 ? 0 : hour, mi: get('minute'), s: get('second') };
}
function offsetMs(date: Date) {
  const w = wall(date);
  return Date.UTC(w.y, w.m - 1, w.d, w.h, w.mi, w.s) - Math.floor(date.getTime() / 1000) * 1000;
}
const pad = (n: number) => String(n).padStart(2, '0');
function toUtc(dayKey: string, time = '00:00') {
  const [y, m, d] = dayKey.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const naive = Date.UTC(y, m - 1, d, hh, mm);
  let guess = new Date(naive - offsetMs(new Date(naive)));
  guess = new Date(naive - offsetMs(guess));
  return guess.toISOString();
}
function today() {
  const w = wall(new Date());
  return `${w.y}-${pad(w.m)}-${pad(w.d)}`;
}
function addDays(key: string, days: number) {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`;
}
const weekday = (key: string) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
};

/* --------------------------------- التنفيذ --------------------------------- */

async function main() {
  // حساب نظيف في كل مرة
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(EMAIL) as { id: string } | undefined;
  if (existing) db.prepare('DELETE FROM users WHERE id = ?').run(existing.id);

  const userId = newId('usr_');
  const t = today();
  const stamp = now();

  db.prepare(
    `INSERT INTO users (id, email, password_hash, name, email_verified, locale, timezone, plan, role, created_at, updated_at)
     VALUES (?,?,?,?,?,'ar',?,'free','user',?,?)`,
  ).run(userId, EMAIL, await bcrypt.hash(PASSWORD, 10), 'أصيل', stamp, TZ, stamp, stamp);

  db.prepare(
    `INSERT INTO user_settings (user_id, default_reminder_offsets, created_at, updated_at) VALUES (?,?,?,?)`,
  ).run(userId, '10', stamp, stamp);

  const workspaceId = newId('wsp_');
  db.prepare(
    `INSERT INTO workspaces (id, name, slug, owner_id, is_personal, plan, created_at, updated_at)
     VALUES (?,?,?,?,1,'free',?,?)`,
  ).run(workspaceId, 'مساحة أصيل', `ws-${randomUUID().slice(0, 8)}`, userId, stamp, stamp);
  db.prepare(
    `INSERT INTO workspace_members (id, workspace_id, user_id, role, joined_at) VALUES (?,?,?,'owner',?)`,
  ).run(newId('wsm_'), workspaceId, userId, stamp);

  // ------------------------------ التصنيفات ------------------------------
  const categoryDefs = [
    ['شخصي', 'violet', 'user'],
    ['العمل', 'blue', 'briefcase'],
    ['الدراسة', 'indigo', 'graduation-cap'],
    ['الصحة', 'emerald', 'heart-pulse'],
    ['المالية', 'amber', 'wallet'],
    ['العائلة', 'pink', 'users'],
    ['مهم', 'rose', 'flag'],
  ];
  const categories: Record<string, string> = {};
  categoryDefs.forEach(([name, color, icon], index) => {
    const id = newId('cat_');
    categories[name] = id;
    db.prepare(
      `INSERT INTO categories (id, user_id, workspace_id, name, color, icon, is_system, sort_order, created_at)
       VALUES (?,?,?,?,?,?,1,?,?)`,
    ).run(id, userId, workspaceId, name, color, icon, index, stamp);
  });

  // ------------------------------- المهام -------------------------------
  interface SeedTask {
    title: string;
    date: string;
    time?: string | null;
    category?: string;
    priority?: string;
    duration?: number | null;
    reminders?: number[];
    recurrence?: object | null;
    status?: 'pending' | 'completed';
    description?: string;
    notes?: string;
  }

  const tasks: SeedTask[] = [
    { title: 'مراجعة المحاضرات', date: t, time: '19:00', category: 'الدراسة', priority: 'high', duration: 90,
      reminders: [1440, 60, 10],
      recurrence: { freq: 'weekly', interval: 1, byWeekday: [0, 2, 4] },
      description: 'مراجعة محاضرات أنظمة قواعد البيانات قبل الاختبار.' },
    { title: 'محاضرة أنظمة قواعد البيانات', date: t, time: '08:00', category: 'الدراسة', priority: 'medium', duration: 60, status: 'completed' },
    { title: 'اجتماع الفريق الأسبوعي', date: t, time: '13:00', category: 'العمل', priority: 'high', duration: 45, status: 'completed', reminders: [15] },
    { title: 'ممارسة الرياضة', date: t, time: '17:00', category: 'الصحة', priority: 'medium', duration: 45, reminders: [30] },
    { title: 'اجتماع مع العميل', date: addDays(t, 1), time: '10:00', category: 'العمل', priority: 'urgent', duration: 60, reminders: [1440, 30] },
    { title: 'إرسال التقرير الأسبوعي', date: addDays(t, 1), time: '15:00', category: 'العمل', priority: 'high', duration: 40 },
    { title: 'دفع فاتورة الكهرباء', date: addDays(t, 5), time: '12:00', category: 'المالية', priority: 'high', reminders: [1440],
      notes: 'رقم الحساب محفوظ في تطبيق البنك.' },
    { title: 'زيارة العائلة', date: addDays(t, 3), time: '18:30', category: 'العائلة', priority: 'medium', duration: 180 },
    { title: 'حجز موعد الفحص الدوري', date: addDays(t, 8), time: '09:30', category: 'الصحة', priority: 'medium' },
    { title: 'تسليم الواجب الثاني', date: addDays(t, 4), time: '23:00', category: 'الدراسة', priority: 'urgent', reminders: [2880, 1440, 60] },
    { title: 'قراءة ٣٠ صفحة', date: addDays(t, 2), time: '21:00', category: 'شخصي', priority: 'low', duration: 45 },
    { title: 'تجديد الاشتراك السنوي', date: addDays(t, 20), time: '11:00', category: 'المالية', priority: 'medium' },
    { title: 'ترتيب ملفات المشروع', date: addDays(t, -2), time: '16:00', category: 'العمل', priority: 'medium' },
    { title: 'الرد على رسائل البريد', date: addDays(t, -1), time: '11:00', category: 'العمل', priority: 'low' },
    { title: 'تلخيص الفصل الأول', date: addDays(t, -6), time: '20:00', category: 'الدراسة', priority: 'high', status: 'completed', duration: 75 },
    { title: 'تمرين المشي', date: addDays(t, -5), time: '18:00', category: 'الصحة', priority: 'low', status: 'completed', duration: 30 },
    { title: 'مراجعة الميزانية الشهرية', date: addDays(t, -4), time: '19:30', category: 'المالية', priority: 'medium', status: 'completed', duration: 60 },
    { title: 'اجتماع بداية المشروع', date: addDays(t, -3), time: '10:00', category: 'العمل', priority: 'high', status: 'completed', duration: 90 },
    { title: 'شراء الأغراض', date: addDays(t, -3), time: '20:00', category: 'شخصي', priority: 'low', status: 'completed' },
    { title: 'تلخيص الفصل الثاني', date: addDays(t, -2), time: '20:00', category: 'الدراسة', priority: 'high', status: 'completed', duration: 80 },
    { title: 'تحديث السيرة الذاتية', date: addDays(t, -8), time: '17:00', category: 'شخصي', priority: 'medium', status: 'completed', duration: 50 },
    { title: 'مكالمة المتابعة', date: addDays(t, -9), time: '14:00', category: 'العمل', priority: 'medium', status: 'completed', duration: 25 },
    { title: 'تنظيم مكتب العمل', date: addDays(t, -11), time: '09:00', category: 'العمل', priority: 'low', status: 'completed', duration: 40 },
    { title: 'مراجعة الفصل الثالث', date: addDays(t, -12), time: '19:00', category: 'الدراسة', priority: 'high', status: 'completed', duration: 90 },
    { title: 'موعد طبيب الأسنان', date: addDays(t, -14), time: '11:30', category: 'الصحة', priority: 'high', status: 'completed', duration: 45 },
  ];

  let created = 0;
  for (const task of tasks) {
    const id = newId('tsk_');
    const dueAt = toUtc(task.date, task.time ?? '00:00');
    const createdAt = toUtc(addDays(task.date, -1), '09:00');
    const completedAt = task.status === 'completed' ? dueAt : null;

    db.prepare(
      `INSERT INTO tasks (id, user_id, workspace_id, category_id, title, description, notes, due_at,
        all_day, duration_min, priority, status, completed_at, is_recurring, recurrence_rule,
        occurrence_date, sort_order, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?,?)`,
    ).run(
      id, userId, workspaceId, task.category ? categories[task.category] : null,
      task.title, task.description ?? null, task.notes ?? null, dueAt,
      task.time ? 0 : 1, task.duration ?? null, task.priority ?? 'medium',
      task.status ?? 'pending', completedAt,
      task.recurrence ? 1 : 0, task.recurrence ? JSON.stringify(task.recurrence) : null,
      task.date, createdAt, createdAt,
    );
    created++;

    // التذكيرات — المستقبلية فقط تبقى مجدولة
    const offsets = task.reminders ?? (task.time ? [10] : []);
    for (const offset of offsets) {
      const triggerAt = new Date(new Date(dueAt).getTime() - offset * 60_000).toISOString();
      const past = new Date(triggerAt).getTime() < Date.now();
      db.prepare(
        `INSERT INTO reminders (id, user_id, task_id, offset_minutes, trigger_at, channel, status, sent_at, attempts, created_at)
         VALUES (?,?,?,?,?, 'push', ?, ?, 0, ?)`,
      ).run(
        newId('rem_'), userId, id, offset, triggerAt,
        past || task.status === 'completed' ? 'sent' : 'scheduled',
        past ? triggerAt : null, createdAt,
      );
    }
  }

  // ------------------------------ المواعيد ------------------------------
  const events = [
    { title: 'اجتماع الفريق الشهري', date: addDays(t, 2), start: '10:00', end: '11:30', location: 'قاعة الاجتماعات', color: 'blue', category: 'العمل' },
    { title: 'حفل تخرّج صديق', date: addDays(t, 9), start: '17:00', end: '20:00', location: 'قاعة الجامعة', color: 'violet', category: 'شخصي' },
    { title: 'ورشة عمل تقنية', date: addDays(t, 6), start: '14:00', end: '17:00', location: 'عن بُعد', color: 'teal', category: 'العمل' },
    { title: 'عشاء العائلة', date: addDays(t, 4), start: '20:00', end: '22:00', location: 'منزل العائلة', color: 'pink', category: 'العائلة' },
    { title: 'مراجعة مع المشرف', date: addDays(t, 1), start: '16:00', end: '16:45', location: 'مكتب ٢٠٤', color: 'indigo', category: 'الدراسة' },
  ];

  for (const event of events) {
    const id = newId('evt_');
    db.prepare(
      `INSERT INTO events (id, user_id, workspace_id, category_id, title, location, start_at, end_at,
        all_day, color, is_recurring, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,0,?,0,?,?)`,
    ).run(
      id, userId, workspaceId, categories[event.category] ?? null, event.title, event.location,
      toUtc(event.date, event.start), toUtc(event.date, event.end), event.color, stamp, stamp,
    );
    const triggerAt = new Date(new Date(toUtc(event.date, event.start)).getTime() - 30 * 60_000).toISOString();
    db.prepare(
      `INSERT INTO reminders (id, user_id, event_id, offset_minutes, trigger_at, channel, status, attempts, created_at)
       VALUES (?,?,?,30,?, 'push', ?, 0, ?)`,
    ).run(newId('rem_'), userId, id, triggerAt, new Date(triggerAt).getTime() < Date.now() ? 'sent' : 'scheduled', stamp);
  }

  // ------------------------------- العادات -------------------------------
  const habits = [
    { title: 'قراءة ٢٠ صفحة', icon: 'book-open', color: 'violet', frequency: 'daily', days: [0,1,2,3,4,5,6], time: '21:00', rate: 0.85, category: 'شخصي' },
    { title: 'ممارسة الرياضة', icon: 'dumbbell', color: 'emerald', frequency: 'custom_days', days: [2, 4], time: '17:00', rate: 0.8, category: 'الصحة' },
    { title: 'شرب ٨ أكواب ماء', icon: 'droplets', color: 'sky', frequency: 'daily', days: [0,1,2,3,4,5,6], time: null, rate: 0.9, category: 'الصحة' },
    { title: 'المذاكرة اليومية', icon: 'brain', color: 'indigo', frequency: 'custom_days', days: [0, 2, 4], time: '19:00', rate: 0.75, category: 'الدراسة' },
    { title: 'النوم مبكرًا', icon: 'moon', color: 'blue', frequency: 'daily', days: [0,1,2,3,4,5,6], time: '23:00', rate: 0.6, category: 'الصحة' },
  ];

  let logCount = 0;
  for (const habit of habits) {
    const id = newId('hab_');
    const startDate = addDays(t, -60);
    db.prepare(
      `INSERT INTO habits (id, user_id, workspace_id, category_id, title, icon, color, frequency,
        target_days, target_per_period, unit, time_of_day, is_archived, start_date, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,1,'مرة',?,0,?,?,?)`,
    ).run(
      id, userId, workspaceId, categories[habit.category] ?? null, habit.title, habit.icon, habit.color,
      habit.frequency, habit.days.join(','), habit.time, startDate, stamp, stamp,
    );

    // سجلّ واقعي: التزام مرتفع في الأيام القريبة، مع فجوات متفرّقة
    for (let i = 60; i >= 0; i--) {
      const day = addDays(t, -i);
      if (!habit.days.includes(weekday(day))) continue;
      // اليوم الحالي: نترك بعضها غير منجزة ليجرّبها المستخدم
      if (i === 0 && ['النوم مبكرًا', 'ممارسة الرياضة'].includes(habit.title)) continue;
      const recencyBoost = i < 10 ? 0.12 : 0;
      if (Math.random() < habit.rate + recencyBoost) {
        db.prepare(
          `INSERT OR IGNORE INTO habit_logs (id, habit_id, user_id, date, value, completed, created_at)
           VALUES (?,?,?,?,1,1,?)`,
        ).run(newId('hlg_'), id, userId, day, toUtc(day, habit.time ?? '20:00'));
        logCount++;
      }
    }

    if (habit.time) {
      const triggerAt = toUtc(addDays(t, 1), habit.time);
      db.prepare(
        `INSERT INTO reminders (id, user_id, habit_id, offset_minutes, trigger_at, channel, status, attempts, created_at)
         VALUES (?,?,?,0,?, 'push', 'scheduled', 0, ?)`,
      ).run(newId('rem_'), userId, id, triggerAt, stamp);
    }
  }

  // ------------------------------ الإشعارات ------------------------------
  const notifications = [
    { type: 'system', title: 'أهلاً بك في نَبّهني، أصيل 👋', body: 'ابدأ بإضافة أول مهمة، وسنتكفّل بتذكيرك في وقتها.', link: '/dashboard', ago: 3 },
    { type: 'reminder', title: '🔔 لديك مهمة بعد ١٥ دقيقة', body: 'مراجعة المحاضرات — ٧:٠٠ مساءً', link: '/tasks', ago: 1 },
    { type: 'streak', title: '🔥 سلسلة ٧ أيام!', body: 'واصلت «قراءة ٢٠ صفحة» ٧ أيام متتالية. استمر!', link: '/habits', ago: 2 },
    { type: 'reschedule', title: 'تم نقل المهمة', body: '«ترتيب ملفات المشروع» أصبحت غدًا الساعة ٧:٠٠ مساءً.', link: '/tasks', ago: 0 },
  ];

  notifications.forEach((notification, index) => {
    const createdAt = new Date(Date.now() - notification.ago * 86_400_000 - index * 3_600_000).toISOString();
    db.prepare(
      `INSERT INTO notifications (id, user_id, type, title, body, link, read_at, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
    ).run(
      newId('ntf_'), userId, notification.type, notification.title, notification.body,
      notification.link, notification.ago > 1 ? createdAt : null, createdAt,
    );
  });

  console.log(`
✅ تمت تعبئة البيانات التجريبية

   المستخدم:      ${EMAIL}
   كلمة المرور:   ${PASSWORD}
   المنطقة:       ${TZ}

   ${created} مهمة · ${events.length} مواعيد · ${habits.length} عادات (${logCount} سجل) · ${Object.keys(categories).length} تصنيفات

   شغّل الآن:  npm run dev   ثم افتح http://localhost:3000
`);
}

main()
  .then(() => db.close())
  .catch((error) => {
    console.error('❌ فشلت تعبئة البيانات:', error);
    db.close();
    process.exit(1);
  });
