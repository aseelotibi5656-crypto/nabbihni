import { z } from 'zod';

/**
 * مخططات التحقق — مصدر الحقيقة الوحيد للتحقق في الخادم والواجهة معاً.
 */

const dateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة التاريخ يجب أن تكون YYYY-MM-DD');
const timeKey = z.string().regex(/^\d{2}:\d{2}$/, 'صيغة الوقت يجب أن تكون HH:mm');

export const emailSchema = z
  .string()
  .trim()
  .min(1, 'البريد الإلكتروني مطلوب')
  .max(254)
  .email('صيغة البريد الإلكتروني غير صحيحة');

export const passwordSchema = z
  .string()
  .min(8, 'كلمة المرور يجب أن تكون ٨ أحرف على الأقل')
  .max(128, 'كلمة المرور طويلة جدًا')
  .refine((v) => /[a-zA-Z؀-ۿ]/.test(v) && /\d/.test(v), {
    message: 'كلمة المرور يجب أن تحتوي على حرف ورقم على الأقل',
  });

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جدًا').max(60, 'الاسم طويل جدًا'),
  email: emailSchema,
  password: passwordSchema,
  timezone: z.string().max(64).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'كلمة المرور مطلوبة').max(128),
  remember: z.boolean().optional(),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(10, 'رابط غير صالح'),
  password: passwordSchema,
});

export const verifyEmailSchema = z.object({ token: z.string().min(10, 'رابط غير صالح') });

export const recurrenceSchema = z.object({
  freq: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().min(1).max(365).default(1),
  byWeekday: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  until: dateKey.nullable().optional(),
  count: z.number().int().min(1).max(999).nullable().optional(),
});

export const reminderOffsetsSchema = z
  .array(z.number().int().min(0).max(43_200))
  .max(6, 'الحد الأقصى ٦ تذكيرات للمهمة الواحدة')
  .default([]);

export const taskCreateSchema = z.object({
  title: z.string().trim().min(1, 'اسم المهمة مطلوب').max(160, 'اسم المهمة طويل جدًا'),
  description: z.string().trim().max(2000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
  date: dateKey.nullable().optional(),
  time: timeKey.nullable().optional(),
  allDay: z.boolean().optional(),
  durationMin: z.number().int().min(0).max(1440).nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  categoryId: z.string().nullable().optional(),
  reminderOffsets: reminderOffsetsSchema.optional(),
  recurrence: recurrenceSchema.nullable().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string().max(200),
        url: z.string().max(2000),
        mimeType: z.string().max(120).default('application/octet-stream'),
        size: z.number().int().min(0).max(50_000_000).default(0),
      }),
    )
    .max(10)
    .optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial().extend({
  status: z.enum(['pending', 'completed', 'archived']).optional(),
});

export const taskQuerySchema = z.object({
  view: z.enum(['today', 'upcoming', 'overdue', 'completed', 'all', 'range']).optional(),
  from: dateKey.optional(),
  to: dateKey.optional(),
  q: z.string().max(120).optional(),
  priority: z.string().max(40).optional(),
  categoryId: z.string().max(40).optional(),
  status: z.string().max(30).optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
});

export const eventCreateSchema = z.object({
  title: z.string().trim().min(1, 'اسم الموعد مطلوب').max(160),
  description: z.string().trim().max(2000).nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  date: dateKey,
  startTime: timeKey.nullable().optional(),
  endTime: timeKey.nullable().optional(),
  allDay: z.boolean().optional(),
  color: z.string().max(20).optional(),
  categoryId: z.string().nullable().optional(),
  reminderOffsets: reminderOffsetsSchema.optional(),
});

export const eventUpdateSchema = eventCreateSchema.partial();

export const habitCreateSchema = z.object({
  title: z.string().trim().min(1, 'اسم العادة مطلوب').max(120),
  description: z.string().trim().max(1000).nullable().optional(),
  icon: z.string().max(40).optional(),
  color: z.string().max(20).optional(),
  frequency: z.enum(['daily', 'custom_days', 'times_per_week']).default('daily'),
  targetDays: z.array(z.number().int().min(0).max(6)).max(7).optional(),
  targetPerPeriod: z.number().int().min(1).max(30).optional(),
  unit: z.string().max(20).optional(),
  timeOfDay: timeKey.nullable().optional(),
  categoryId: z.string().nullable().optional(),
  reminderEnabled: z.boolean().optional(),
});

export const habitUpdateSchema = habitCreateSchema.partial().extend({
  isArchived: z.boolean().optional(),
});

export const habitLogSchema = z.object({
  date: dateKey,
  completed: z.boolean().default(true),
  value: z.number().int().min(0).max(999).optional(),
  note: z.string().max(500).nullable().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'اسم التصنيف مطلوب').max(40),
  color: z.string().max(20).optional(),
  icon: z.string().max(40).optional(),
});

export const settingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']).optional(),
  accentColor: z.string().max(20).optional(),
  weekStartsOn: z.number().int().min(0).max(6).optional(),
  timeFormat: z.enum(['12', '24']).optional(),
  defaultView: z.enum(['day', 'week', 'month', 'year']).optional(),
  pushEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  soundEnabled: z.boolean().optional(),
  dailyDigest: z.boolean().optional(),
  digestTime: timeKey.optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: timeKey.optional(),
  quietHoursEnd: timeKey.optional(),
  defaultReminderOffsets: z.array(z.number().int().min(0).max(43_200)).max(6).optional(),
  smartRemindersEnabled: z.boolean().optional(),
  smartRescheduleEnabled: z.boolean().optional(),
  analyticsOptIn: z.boolean().optional(),
  profilePublic: z.boolean().optional(),
});

export const profileSchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جدًا').max(60).optional(),
  avatarUrl: z.string().max(500_000).nullable().optional(),
  timezone: z.string().max(64).optional(),
  locale: z.string().max(8).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'كلمة المرور الحالية مطلوبة'),
  newPassword: passwordSchema,
});

export const pushSubscribeSchema = z.object({
  endpoint: z.string().min(10).max(1000),
  keys: z.object({ p256dh: z.string().min(10), auth: z.string().min(5) }),
});

export const aiParseSchema = z.object({
  text: z.string().trim().min(2, 'اكتب طلبك أولاً').max(600),
});

export const rescheduleSchema = z.object({
  date: dateKey,
  time: timeKey.nullable().optional(),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  types: z.string().max(60).optional(),
  priority: z.string().max(40).optional(),
  categoryId: z.string().max(40).optional(),
  status: z.string().max(30).optional(),
  from: dateKey.optional(),
  to: dateKey.optional(),
});

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
export type TaskUpdateInput = z.infer<typeof taskUpdateSchema>;
export type EventCreateInput = z.infer<typeof eventCreateSchema>;
export type HabitCreateInput = z.infer<typeof habitCreateSchema>;
export type SettingsInput = z.infer<typeof settingsSchema>;
