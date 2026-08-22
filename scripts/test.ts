/**
 * اختبارات شاملة للـ API وللمنطق الداخلي.
 * تشغّل خادم Next محليًا وتختبر كل رحلة يمر بها المستخدم فعليًا.
 *
 * الاستخدام:  npm test            (يشغّل الخادم تلقائيًا)
 *             BASE_URL=... npm test   (اختبار خادم يعمل بالفعل)
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { DatabaseSync } from 'node:sqlite';
import { existsSync } from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE_URL ?? 'http://127.0.0.1:3100';
const OWN_SERVER = !process.env.BASE_URL;

let passed = 0;
let failed = 0;
const failures: string[] = [];

function check(name: string, condition: boolean, detail?: unknown) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`  ❌ ${name}${detail !== undefined ? ` → ${JSON.stringify(detail).slice(0, 220)}` : ''}`);
  }
}

function section(title: string) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
}

/* ------------------------------ عميل HTTP ------------------------------ */

let cookie = '';

async function call(
  method: string,
  path: string,
  body?: unknown,
  options: { auth?: boolean } = { auth: true },
) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.auth !== false && cookie ? { cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const setCookie = response.headers.get('set-cookie');
  if (setCookie?.includes('nabbihni_session=')) {
    const value = setCookie.split(';')[0];
    cookie = value.endsWith('=') ? '' : value;
  }

  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text.slice(0, 200) };
  }
  return { status: response.status, data, text };
}

/**
 * مفاتيح الأيام تُحسب بتوقيت الحساب (Asia/Riyadh) لا بتوقيت UTC،
 * لأن التطبيق نفسه يحسبها بتوقيت المستخدم. استخدام UTC هنا يجعل
 * الاختبار يفشل زورًا في الساعات التي يختلف فيها التاريخان.
 */
const ACCOUNT_TZ = 'Asia/Riyadh';
const keyIn = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: ACCOUNT_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const today = () => keyIn(new Date());
const addDays = (days: number) => keyIn(new Date(Date.now() + days * 86_400_000));

/* -------------------------------- التشغيل -------------------------------- */

async function waitForServer(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${BASE}/api/push/vapid`);
      if (response.ok) return true;
    } catch {
      /* لم يبدأ بعد */
    }
    await sleep(1000);
  }
  return false;
}

async function run() {
  const email = `test_${Date.now()}@nabbihni.test`;
  const password = 'Test12345';

  /* ============================= المصادقة ============================= */
  section('١) المصادقة');

  const badRegister = await call('POST', '/api/auth/register', { name: 'ا', email: 'bad', password: '123' });
  check('رفض بيانات تسجيل غير صالحة (400)', badRegister.status === 400, badRegister.data);
  check('رسائل الخطأ بالعربية ومفصّلة لكل حقل', Boolean((badRegister.data as { details?: object }).details));

  const register = await call('POST', '/api/auth/register', { name: 'مستخدم اختبار', email, password });
  check('إنشاء حساب جديد (201)', register.status === 201, register.data);
  check('تعيين كوكي الجلسة تلقائيًا', cookie.length > 20);

  const duplicate = await call('POST', '/api/auth/register', { name: 'آخر', email, password }, { auth: false });
  check('منع تكرار البريد الإلكتروني (409)', duplicate.status === 409, duplicate.data);

  const me = await call('GET', '/api/auth/me');
  check('قراءة بيانات المستخدم الحالي', me.status === 200 && (me.data as any).user?.email === email);
  check('إنشاء إعدادات افتراضية للمستخدم', Boolean((me.data as any).settings));

  const categories = await call('GET', '/api/categories');
  const categoryList = (categories.data as any).categories as { id: string; name: string }[];
  check('إنشاء التصنيفات الجاهزة تلقائيًا (٧)', categoryList?.length === 7, categoryList?.length);

  /* ============================== المهام ============================== */
  section('٢) المهام');

  const createTask = await call('POST', '/api/tasks', {
    title: 'مراجعة الفصل الثالث',
    description: 'اختبار إنشاء مهمة',
    date: today(),
    time: '19:00',
    priority: 'high',
    categoryId: categoryList[2].id,
    reminderOffsets: [1440, 60, 10],
    durationMin: 90,
  });
  const taskId = (createTask.data as any).task?.id as string;
  check('إنشاء مهمة (201)', createTask.status === 201, createTask.data);
  check('حفظ الأولوية والتصنيف', (createTask.data as any).task?.priority === 'high');
  check('إنشاء ٣ تذكيرات للمهمة الواحدة', (createTask.data as any).task?.reminders?.length === 3);
  check('حفظ مدة المهمة', (createTask.data as any).task?.durationMin === 90);

  const invalidTask = await call('POST', '/api/tasks', { title: '', date: 'not-a-date' });
  check('رفض مهمة بلا عنوان (400)', invalidTask.status === 400);

  const update = await call('PATCH', `/api/tasks/${taskId}`, { title: 'مراجعة الفصل الثالث — معدّل', priority: 'urgent' });
  check('تعديل المهمة', update.status === 200 && (update.data as any).task?.priority === 'urgent');

  const complete = await call('POST', `/api/tasks/${taskId}/complete`, { completed: true });
  check('إكمال المهمة', complete.status === 200 && (complete.data as any).task?.status === 'completed');

  const uncomplete = await call('POST', `/api/tasks/${taskId}/complete`, { completed: false });
  check('التراجع عن الإكمال', (uncomplete.data as any).task?.status === 'pending');

  const todayList = await call('GET', '/api/tasks?view=today');
  check('عرض مهام اليوم', todayList.status === 200 && (todayList.data as any).tasks.length >= 1);

  const searchTasks = await call('GET', '/api/tasks?q=' + encodeURIComponent('مراجعه'));
  check('البحث العربي يتجاهل الهمزات والتاء المربوطة', (searchTasks.data as any).tasks.length >= 1);

  const filtered = await call('GET', '/api/tasks?view=all&priority=urgent');
  check('الفلترة حسب الأولوية', (filtered.data as any).tasks.every((t: any) => t.priority === 'urgent'));

  /* ============================ المهام المتكررة ============================ */
  section('٣) التكرار');

  const recurring = await call('POST', '/api/tasks', {
    title: 'مراجعة المحاضرات',
    date: today(),
    time: '19:00',
    recurrence: { freq: 'weekly', interval: 1, byWeekday: [0, 2, 4] },
    reminderOffsets: [10],
  });
  const recurringId = (recurring.data as any).task?.id as string;
  check('إنشاء مهمة متكررة', (recurring.data as any).task?.isRecurring === true);
  check('حفظ أيام التكرار', (recurring.data as any).task?.recurrenceRule?.byWeekday?.length === 3);

  const before = ((await call('GET', '/api/tasks?view=all&limit=200')).data as any).tasks.length;
  await call('POST', `/api/tasks/${recurringId}/complete`, { completed: true });
  const after = ((await call('GET', '/api/tasks?view=all&limit=200')).data as any).tasks.length;
  check('إكمال المهمة المتكررة ينشئ النسخة التالية', after === before + 1, { before, after });

  /* ============================ إعادة الجدولة ============================ */
  section('٤) إعادة الجدولة الذكية');

  const overdueTask = await call('POST', '/api/tasks', {
    title: 'مهمة متأخرة',
    date: addDays(-2),
    time: '10:00',
    reminderOffsets: [10],
  });
  const overdueId = (overdueTask.data as any).task?.id as string;

  const overdueList = await call('GET', '/api/tasks?view=overdue');
  check('ظهور المهمة في قائمة المتأخرة', (overdueList.data as any).tasks.some((t: any) => t.id === overdueId));

  const suggestions = await call('GET', '/api/suggestions');
  check('اقتراح أوقات لإعادة الجدولة', (suggestions.data as any).suggestions?.length === 3, suggestions.data);

  const rescheduled = await call('POST', `/api/tasks/${overdueId}/reschedule`, { date: addDays(1), time: '19:00' });
  check('نقل المهمة إلى وقت جديد', rescheduled.status === 200 && (rescheduled.data as any).task?.rescheduleCount === 1);
  check('إعادة جدولة التذكيرات مع المهمة', (rescheduled.data as any).task?.reminders?.length >= 1);

  /* ============================== المواعيد ============================== */
  section('٥) المواعيد');

  const event = await call('POST', '/api/events', {
    title: 'اجتماع الفريق',
    date: addDays(1),
    startTime: '10:00',
    endTime: '11:00',
    location: 'قاعة الاجتماعات',
    reminderOffsets: [30],
  });
  const eventId = (event.data as any).event?.id as string;
  check('إنشاء موعد (201)', event.status === 201, event.data);
  check('حفظ وقت البداية والنهاية', Boolean((event.data as any).event?.endAt));

  const eventUpdate = await call('PATCH', `/api/events/${eventId}`, { title: 'اجتماع الفريق الأسبوعي' });
  check('تعديل الموعد', (eventUpdate.data as any).event?.title === 'اجتماع الفريق الأسبوعي');

  const eventsRange = await call('GET', `/api/events?from=${today()}&to=${addDays(7)}`);
  check('جلب مواعيد نطاق زمني', (eventsRange.data as any).events.length >= 1);

  /* =============================== العادات =============================== */
  section('٦) العادات');

  const habit = await call('POST', '/api/habits', {
    title: 'قراءة ٢٠ صفحة',
    frequency: 'daily',
    targetDays: [0, 1, 2, 3, 4, 5, 6],
    timeOfDay: '21:00',
    reminderEnabled: true,
    color: 'violet',
    icon: 'book-open',
  });
  const habitId = (habit.data as any).habit?.id as string;
  check('إنشاء عادة (201)', habit.status === 201, habit.data);
  check('حساب الإحصائيات مع الإنشاء', typeof (habit.data as any).habit?.stats?.currentStreak === 'number');

  const log1 = await call('POST', `/api/habits/${habitId}/log`, { date: today(), completed: true });
  check('تسجيل إنجاز اليوم', (log1.data as any).habit?.stats?.doneToday === true);
  check('احتساب السلسلة الحالية', (log1.data as any).habit?.stats?.currentStreak === 1);

  await call('POST', `/api/habits/${habitId}/log`, { date: addDays(-1), completed: true });
  const log3 = await call('POST', `/api/habits/${habitId}/log`, { date: addDays(-2), completed: true });
  check('سلسلة ٣ أيام متتالية', (log3.data as any).habit?.stats?.currentStreak === 3, (log3.data as any).habit?.stats);

  const duplicateLog = await call('POST', `/api/habits/${habitId}/log`, { date: today(), completed: true });
  check('منع ازدواج تسجيل نفس اليوم', (duplicateLog.data as any).habit?.stats?.totalCompletions === 3);

  const unlog = await call('POST', `/api/habits/${habitId}/log`, { date: today(), completed: false });
  check('التراجع عن تسجيل العادة', (unlog.data as any).habit?.stats?.doneToday === false);

  /* ============================== التصنيفات ============================== */
  section('٧) التصنيفات');

  const newCategory = await call('POST', '/api/categories', { name: 'مشاريع جانبية', color: 'teal' });
  const categoryId = (newCategory.data as any).category?.id as string;
  check('إنشاء تصنيف مخصص', newCategory.status === 201, newCategory.data);

  const dupCategory = await call('POST', '/api/categories', { name: 'مشاريع جانبية' });
  check('منع تكرار اسم التصنيف (409)', dupCategory.status === 409);

  const renamed = await call('PATCH', `/api/categories/${categoryId}`, { name: 'مشاريع شخصية' });
  check('تعديل التصنيف', (renamed.data as any).category?.name === 'مشاريع شخصية');

  const deletedCategory = await call('DELETE', `/api/categories/${categoryId}`);
  check('حذف التصنيف', deletedCategory.status === 200);

  /* ============================ المساعد الذكي ============================ */
  section('٨) المساعد الذكي');

  const parse1 = await call('POST', '/api/ai/parse', {
    text: 'ذكرني أذاكر الفصل الثالث يوم الخميس الساعة 7 مساءً',
  });
  const draft1 = (parse1.data as any).result?.draft;
  check('تحليل جملة عربية كاملة', parse1.status === 200, parse1.data);
  check('استخراج الوقت ٧ مساءً → 19:00', draft1?.time === '19:00', draft1);
  check('استخراج يوم الخميس', Boolean(draft1?.date) && new Date(draft1.date + 'T00:00:00Z').getUTCDay() === 4, draft1?.date);
  check('استخراج عنوان نظيف بلا كلمات وظيفية', !/ذكرني|الساعه|يوم/.test(draft1?.title ?? ''), draft1?.title);
  check('اقتراح تصنيف الدراسة تلقائيًا', draft1?.categoryName === 'الدراسة', draft1?.categoryName);
  check('إضافة تذكير افتراضي', draft1?.reminderOffsets?.length >= 1);

  const parse2 = await call('POST', '/api/ai/parse', { text: 'اجتماع الفريق بكرة الساعة 10 صباحا' });
  const draft2 = (parse2.data as any).result?.draft;
  check('فهم «بكرة» كتاريخ الغد', draft2?.date === addDays(1), draft2?.date);
  check('فهم «١٠ صباحًا» → 10:00', draft2?.time === '10:00', draft2?.time);
  check('تمييز الموعد عن المهمة', (parse2.data as any).result?.intent === 'create_event');

  const parse3 = await call('POST', '/api/ai/parse', {
    text: 'مراجعة المحاضرات كل أحد وثلاثاء وخميس الساعة 7 مساء',
  });
  const draft3 = (parse3.data as any).result?.draft;
  check('استخراج التكرار الأسبوعي بأيام محددة', draft3?.recurrence?.byWeekday?.length === 3, draft3?.recurrence);

  const parse4 = await call('POST', '/api/ai/parse', { text: 'ذكرني اتصل بأحمد' });
  const result4 = (parse4.data as any).result;
  check('طلب معلومة ناقصة بدل التخمين', Boolean(result4?.clarification), result4);
  check('تحديد الحقول الناقصة', result4?.missing?.includes('date'));

  // حالات لغوية إضافية
  const linguistic: [string, (d: any) => boolean, string][] = [
    ['محاضرة أنظمة قواعد البيانات اليوم 8 صباحا', (d) => d.time === '08:00' && !/\d/.test(d.title), 'وقت بلا كلمة «الساعة» + عنوان نظيف'],
    ['ذكرني أشتري الأغراض بعد يومين الساعة 5 م', (d) => d.time === '17:00' && Boolean(d.date), '«بعد يومين» + «٥ م»'],
    ['اجتماع عاجل مع العميل بكرة 9 صباحا', (d) => d.priority === 'urgent' && d.time === '09:00', 'استخراج الأولوية العاجلة'],
    ['رياضة كل يوم الساعة 6 العصر', (d) => d.recurrence?.freq === 'daily' && d.time === '18:00', 'تكرار يومي + وقت العصر'],
    ['دفع فاتورة الكهرباء 15 أغسطس', (d) => d.date?.endsWith('-08-15'), 'تاريخ صريح باليوم والشهر'],
  ];
  for (const [text, assert, label] of linguistic) {
    const response = await call('POST', '/api/ai/parse', { text });
    const draft = (response.data as any).result?.draft;
    check(`تحليل: ${label}`, assert(draft), draft);
  }

  const aiCreate = await call('POST', '/api/ai/create', {
    kind: 'task',
    categoryName: draft1?.categoryName,
    payload: {
      title: draft1.title,
      date: draft1.date,
      time: draft1.time,
      priority: draft1.priority,
      reminderOffsets: draft1.reminderOffsets,
    },
  });
  check('إنشاء المهمة من مسودّة المساعد', aiCreate.status === 201, aiCreate.data);

  /* =============================== البحث =============================== */
  section('٩) البحث الشامل');

  const search = await call('GET', '/api/search?q=' + encodeURIComponent('اجتماع'));
  check('البحث يشمل المهام والمواعيد', (search.data as any).total >= 1, (search.data as any).total);

  const searchFiltered = await call('GET', '/api/search?types=habit&q=' + encodeURIComponent('قراءة'));
  check('تحديد نوع البحث', (searchFiltered.data as any).habits?.length >= 1);

  /* ============================= الإشعارات ============================= */
  section('١٠) الإشعارات والتذكيرات');

  const notifications = await call('GET', '/api/notifications');
  check('وجود إشعار الترحيب', (notifications.data as any).notifications.length >= 1);
  check('عدّاد غير المقروء', typeof (notifications.data as any).unread === 'number');

  const firstNotification = (notifications.data as any).notifications[0];
  const markRead = await call('POST', `/api/notifications/${firstNotification.id}`);
  check('تعليم الإشعار كمقروء', markRead.status === 200);

  const readAll = await call('POST', '/api/notifications/read-all');
  check('تعليم كل الإشعارات كمقروءة', (readAll.data as any).unread === 0);

  // تذكير مستحق الآن → يجب أن يُرسل ولا يتكرر
  // الوقت يُرسل كساعة جدارية بتوقيت الحساب، لذا نحسبه بنفس المنطقة
  const soon = new Date(Date.now() + 60_000);
  const wallTime = new Intl.DateTimeFormat('en-GB', {
    timeZone: ACCOUNT_TZ,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
  }).format(soon);
  await call('POST', '/api/tasks', {
    title: 'تذكير فوري للاختبار',
    date: keyIn(soon),
    time: wallTime,
    reminderOffsets: [5],
  });
  const due1 = await call('GET', '/api/notifications/due');
  check('إرسال التذكير المستحق', (due1.data as any).reminders?.length >= 1, (due1.data as any).reminders);
  const due2 = await call('GET', '/api/notifications/due');
  check('عدم تكرار إرسال نفس التذكير', (due2.data as any).reminders?.length === 0);

  const pushTest = await call('POST', '/api/push/test');
  check('الإشعار التجريبي يعمل بلا مفاتيح VAPID', pushTest.status === 200, pushTest.data);

  const vapid = await call('GET', '/api/push/vapid', undefined, { auth: false });
  check('نقطة مفاتيح VAPID متاحة', vapid.status === 200);

  /* ============================== الإعدادات ============================== */
  section('١١) الإعدادات والملف الشخصي');

  const settings = await call('PATCH', '/api/settings', {
    theme: 'dark',
    timeFormat: '24',
    defaultReminderOffsets: [15, 60],
    quietHoursEnabled: true,
  });
  check('حفظ الإعدادات', settings.status === 200 && (settings.data as any).settings?.theme === 'dark');
  check('حفظ مصفوفة التذكيرات الافتراضية', (settings.data as any).settings?.defaultReminderOffsets?.length === 2);
  check('حفظ القيم المنطقية', (settings.data as any).settings?.quietHoursEnabled === true);

  const badSettings = await call('PATCH', '/api/settings', { theme: 'neon', weekStartsOn: 99 });
  check('رفض قيم إعدادات غير صالحة (400)', badSettings.status === 400);

  const profile = await call('PATCH', '/api/profile', { name: 'أصيل العتيبي', timezone: 'Asia/Dubai' });
  check('تحديث الملف الشخصي', (profile.data as any).user?.name === 'أصيل العتيبي');
  check('تغيير المنطقة الزمنية', (profile.data as any).user?.timezone === 'Asia/Dubai');

  await call('PATCH', '/api/profile', { timezone: 'Asia/Riyadh' });

  /* ============================= الإحصائيات ============================= */
  section('١٢) الإحصائيات');

  const analytics = await call('GET', '/api/analytics?days=30');
  const payload = (analytics.data as any).analytics;
  check('بناء الإحصائيات', analytics.status === 200, analytics.data);
  check('سلسلة يومية بطول ٣٠ يومًا', payload?.daily?.length === 30, payload?.daily?.length);
  check('تفصيل حسب أيام الأسبوع (٧)', payload?.byWeekday?.length === 7);
  check('تفصيل حسب الأولوية (٤)', payload?.byPriority?.length === 4);
  check('تفصيل شهري (٦ أشهر)', payload?.monthly?.length === 6);
  check('احتساب ساعات التركيز', typeof payload?.totals?.focusMinutes === 'number');

  const badRange = await call('GET', '/api/analytics?days=9999');
  check('رفض نطاق زمني خارج الحدود (400)', badRange.status === 400);

  /* =============================== الأمان =============================== */
  section('١٣) الأمان والصلاحيات');

  const savedCookie = cookie;
  cookie = '';
  const anonymous = await call('GET', '/api/tasks', undefined, { auth: false });
  check('منع الوصول بلا جلسة (401)', anonymous.status === 401, anonymous.data);

  const anonymousWrite = await call('POST', '/api/tasks', { title: 'اختراق' }, { auth: false });
  check('منع الكتابة بلا جلسة (401)', anonymousWrite.status === 401);

  // مستخدم ثانٍ يحاول قراءة بيانات الأول
  const secondEmail = `test2_${Date.now()}@nabbihni.test`;
  await call('POST', '/api/auth/register', { name: 'مستخدم ثانٍ', email: secondEmail, password }, { auth: false });
  const stealTask = await call('GET', `/api/tasks/${taskId}`);
  check('عزل البيانات: لا يرى مستخدم مهام غيره (404)', stealTask.status === 404, stealTask.status);

  const stealUpdate = await call('PATCH', `/api/tasks/${taskId}`, { title: 'مُخترق' });
  check('عزل البيانات: منع تعديل مهام الغير (404)', stealUpdate.status === 404);

  const stealDelete = await call('DELETE', `/api/tasks/${taskId}`);
  check('عزل البيانات: منع حذف مهام الغير (404)', stealDelete.status === 404);

  const stealHabit = await call('POST', `/api/habits/${habitId}/log`, { date: today(), completed: true });
  check('عزل البيانات: منع تسجيل عادات الغير (404)', stealHabit.status === 404);

  cookie = savedCookie;

  const wrongPassword = await call('POST', '/api/auth/login', { email, password: 'WrongPass123' }, { auth: false });
  check('رفض كلمة مرور خاطئة (401)', wrongPassword.status === 401);
  check('عدم كشف وجود البريد في رسالة الخطأ', /البريد الإلكتروني أو كلمة المرور/.test(String((wrongPassword.data as any).message)));

  const unknownEmail = await call('POST', '/api/auth/forgot-password', { email: 'ghost@nowhere.test' }, { auth: false });
  check('عدم كشف البريد غير المسجّل في استعادة كلمة المرور', unknownEmail.status === 200);

  // حدّ المعدّل على تسجيل الدخول — ببريد مستقل حتى لا يتأثر بقية الاختبار
  const victimEmail = `victim_${Date.now()}@nabbihni.test`;
  let limited = false;
  for (let i = 0; i < 14; i++) {
    const attempt = await call('POST', '/api/auth/login', { email: victimEmail, password: 'WrongPass123' }, { auth: false });
    if (attempt.status === 429) {
      limited = true;
      break;
    }
  }
  check('تفعيل حدّ المعدّل بعد محاولات متكررة (429)', limited);

  const stillOpen = await call('POST', '/api/auth/login', { email, password }, { auth: false });
  check('حدّ المعدّل لا يقفل بقية الحسابات من نفس المصدر', stillOpen.status === 200, stillOpen.data);

  /* ============================ تسجيل الدخول ============================ */
  section('١٤) دورة الجلسة');

  cookie = '';
  const login = await call('POST', '/api/auth/login', { email: secondEmail, password }, { auth: false });
  check('تسجيل الدخول بحساب صحيح', login.status === 200, login.data);
  check('استلام كوكي جلسة جديد', cookie.length > 20);

  const authed = await call('GET', '/api/auth/me');
  check('الجلسة الجديدة تعمل', authed.status === 200);

  const logout = await call('POST', '/api/auth/logout');
  check('تسجيل الخروج', logout.status === 200);

  const afterLogout = await call('GET', '/api/auth/me');
  check('إبطال الجلسة بعد الخروج (401)', afterLogout.status === 401);

  /* ============================== الصفحات ============================== */
  section('١٥) الصفحات والتوجيه');

  const pages = [
    ['/', 'الصفحة الرئيسية'],
    ['/login', 'تسجيل الدخول'],
    ['/register', 'إنشاء حساب'],
    ['/forgot-password', 'نسيت كلمة المرور'],
    ['/reset-password', 'إعادة التعيين'],
    ['/verify-email', 'تفعيل البريد'],
    ['/offline', 'صفحة عدم الاتصال'],
    ['/manifest.webmanifest', 'ملف البيان (PWA)'],
    ['/sw.js', 'Service Worker'],
    ['/icons/icon-192.png', 'أيقونة التطبيق'],
  ];
  for (const [path, label] of pages) {
    const response = await fetch(`${BASE}${path}`);
    check(`${label} (${path})`, response.ok, response.status);
  }

  const notFound = await fetch(`${BASE}/this-page-does-not-exist`);
  check('صفحة ٤٠٤ مخصصة', notFound.status === 404);

  // الصفحات المحميّة تحوّل إلى تسجيل الدخول
  for (const path of ['/dashboard', '/tasks', '/calendar', '/habits', '/analytics', '/settings', '/profile', '/notifications']) {
    const response = await fetch(`${BASE}${path}`, { redirect: 'manual' });
    const redirected = response.status === 307 || response.status === 302;
    check(`حماية ${path} بإعادة التوجيه`, redirected, response.status);
  }

  // صفحات التطبيق تعمل مع جلسة صالحة
  cookie = '';
  await call('POST', '/api/auth/login', { email, password }, { auth: false });
  for (const path of ['/dashboard', '/tasks', '/calendar', '/habits', '/analytics', '/settings', '/profile', '/notifications']) {
    const response = await fetch(`${BASE}${path}`, { headers: { cookie } });
    const html = await response.text();
    const hasRtl = html.includes('dir="rtl"');
    check(`${path} يعمل ويعرض RTL`, response.ok && hasRtl, response.status);
  }

  /* ============================ المجدول الخارجي ============================ */
  section('١٦) مجدول التذكيرات');

  const cronNoSecret = await fetch(`${BASE}/api/cron/dispatch`);
  check('حماية مسار المجدول برمز سري (401)', cronNoSecret.status === 401);

  const cronOk = await fetch(`${BASE}/api/cron/dispatch`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET ?? 'dev-cron-secret'}` },
  });
  check('عمل المجدول بالرمز الصحيح', cronOk.ok, cronOk.status);

  /* ============================== التنظيف ============================== */
  section('١٧) حذف الحساب');

  const deleteAccount = await call('DELETE', '/api/profile');
  check('حذف الحساب نهائيًا', deleteAccount.status === 200);

  const afterDelete = await call('GET', '/api/auth/me');
  check('إبطال الوصول بعد حذف الحساب (401)', afterDelete.status === 401);
}

/* ------------------------------- المشغّل ------------------------------- */

let server: ChildProcess | null = null;

/** تصفير عدّادات حدّ المعدّل حتى لا تتسرّب نتائج تشغيل سابق إلى هذا التشغيل */
function resetRateLimits() {
  const file = process.env.DATABASE_FILE ?? path.join(process.cwd(), 'data', 'nabbihni.db');
  if (!existsSync(file)) return;
  const db = new DatabaseSync(file);
  db.exec('DELETE FROM rate_limits;');
  db.close();
}

async function main() {
  resetRateLimits();
  if (OWN_SERVER) {
    console.log('🚀 تشغيل خادم الإنتاج على المنفذ 3100…');
    server = spawn('npx', ['next', 'start', '-p', '3100', '-H', '127.0.0.1'], {
      stdio: ['ignore', 'ignore', 'pipe'],
      env: { ...process.env, NODE_ENV: 'production' },
    });
    server.stderr?.on('data', (chunk) => {
      const text = String(chunk);
      if (text.includes('Error')) console.error('[server]', text.trim().slice(0, 300));
    });

    if (!(await waitForServer())) {
      console.error('❌ لم يبدأ الخادم في الوقت المحدد.');
      server.kill();
      process.exit(1);
    }
    console.log('✅ الخادم يعمل\n');
  }

  const started = Date.now();
  try {
    await run();
  } catch (error) {
    failed++;
    failures.push('خطأ غير متوقع أثناء التشغيل');
    console.error('\n💥', error);
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`\n${'─'.repeat(58)}`);
  console.log(`\x1b[1mالنتيجة:\x1b[0m ✅ ${passed} ناجح   ❌ ${failed} فاشل   (${seconds} ثانية)`);
  if (failures.length) {
    console.log('\nالاختبارات الفاشلة:');
    failures.forEach((name) => console.log(`  • ${name}`));
  }
  console.log('─'.repeat(58));

  server?.kill('SIGKILL');
  await sleep(300);
  process.exit(failed > 0 ? 1 : 0);
}

main();
