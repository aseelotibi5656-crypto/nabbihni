/**
 * أنواع البيانات المشتركة بين الواجهة والخادم.
 * هذا الملف آمن للاستيراد في مكوّنات العميل (لا يحتوي أي كود خادم).
 */

export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'completed' | 'archived';
export type Plan = 'free' | 'pro' | 'business';
export type WorkspaceRole = 'owner' | 'admin' | 'member';
export type ReminderChannel = 'push' | 'email' | 'inapp' | 'whatsapp';
export type ReminderStatus = 'scheduled' | 'sent' | 'failed' | 'cancelled' | 'dismissed';
export type NotificationType = 'reminder' | 'digest' | 'system' | 'reschedule' | 'streak';
export type HabitFrequency = 'daily' | 'custom_days' | 'times_per_week';
export type ThemeMode = 'light' | 'dark' | 'system';
export type CalendarView = 'day' | 'week' | 'month' | 'year';

export type RecurrenceFreq = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface RecurrenceRule {
  freq: RecurrenceFreq;
  /** كل كم وحدة يتكرر (كل يومين = daily/2) */
  interval: number;
  /** أيام الأسبوع المستهدفة 0=الأحد … 6=السبت (لـ weekly فقط) */
  byWeekday?: number[];
  /** تاريخ الانتهاء بصيغة YYYY-MM-DD */
  until?: string | null;
  /** عدد مرات التكرار كحد أقصى */
  count?: number | null;
}

export interface PublicUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  locale: string;
  timezone: string;
  plan: Plan;
  createdAt: string;
}

export interface UserSettings {
  theme: ThemeMode;
  accentColor: string;
  weekStartsOn: number;
  timeFormat: '12' | '24';
  defaultView: CalendarView;
  pushEnabled: boolean;
  emailEnabled: boolean;
  soundEnabled: boolean;
  dailyDigest: boolean;
  digestTime: string;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  defaultReminderOffsets: number[];
  smartRemindersEnabled: boolean;
  smartRescheduleEnabled: boolean;
  analyticsOptIn: boolean;
  profilePublic: boolean;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  isSystem: boolean;
  sortOrder: number;
  taskCount?: number;
}

export interface Reminder {
  id: string;
  offsetMinutes: number;
  triggerAt: string;
  channel: ReminderChannel;
  status: ReminderStatus;
  taskId?: string | null;
  eventId?: string | null;
  habitId?: string | null;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  notes: string | null;
  dueAt: string | null;
  allDay: boolean;
  durationMin: number | null;
  priority: Priority;
  status: TaskStatus;
  completedAt: string | null;
  rescheduleCount: number;
  isRecurring: boolean;
  recurrenceRule: RecurrenceRule | null;
  recurrenceParentId: string | null;
  categoryId: string | null;
  category?: Pick<Category, 'id' | 'name' | 'color' | 'icon'> | null;
  reminders: Reminder[];
  attachments: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string;
  categoryId: string | null;
  category?: Pick<Category, 'id' | 'name' | 'color'> | null;
  reminders: Reminder[];
  createdAt: string;
}

export interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalCompletions: number;
  /** آخر ٧ أيام: تواريخ + هل أُنجزت */
  weekProgress: { date: string; done: boolean; scheduled: boolean }[];
  doneToday: boolean;
}

export interface Habit {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  frequency: HabitFrequency;
  targetDays: number[];
  targetPerPeriod: number;
  unit: string;
  timeOfDay: string | null;
  isArchived: boolean;
  startDate: string;
  categoryId: string | null;
  stats: HabitStats;
  /** سجلّ آخر ٩٠ يوماً YYYY-MM-DD */
  logs: string[];
  createdAt: string;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

/** عنصر موحّد في الجدول الزمني (مهمة أو موعد أو عادة) */
export interface AgendaItem {
  id: string;
  kind: 'task' | 'event' | 'habit';
  title: string;
  at: string | null;
  endAt?: string | null;
  allDay: boolean;
  done: boolean;
  priority?: Priority;
  color: string;
  categoryName?: string | null;
  location?: string | null;
  overdue?: boolean;
}

export interface DashboardSummary {
  todayTotal: number;
  todayCompleted: number;
  overdue: number;
  completionRate: number;
  nextUp: AgendaItem | null;
  habitsDueToday: number;
  habitsDoneToday: number;
  streak: number;
}

export interface AnalyticsPayload {
  range: { from: string; to: string; days: number };
  totals: {
    created: number;
    completed: number;
    overdue: number;
    pending: number;
    completionRate: number;
    focusMinutes: number;
    habitCompletions: number;
    bestStreak: number;
  };
  daily: { date: string; completed: number; created: number }[];
  byWeekday: { weekday: number; label: string; completed: number }[];
  byCategory: { name: string; color: string; completed: number; total: number }[];
  byPriority: { priority: Priority; count: number }[];
  habits: { title: string; color: string; rate: number; streak: number }[];
  monthly: { month: string; completed: number }[];
}

/** ناتج تحليل المساعد الذكي للغة الطبيعية */
export interface AiParseResult {
  intent: 'create_task' | 'create_event' | 'create_habit' | 'query' | 'unknown';
  confidence: number;
  /** أسئلة توضيحية عند نقص المعلومات */
  missing: string[];
  clarification: string | null;
  draft: {
    title: string;
    date: string | null;
    time: string | null;
    priority: Priority;
    categoryName: string | null;
    reminderOffsets: number[];
    durationMin: number | null;
    recurrence: RecurrenceRule | null;
    notes: string | null;
  };
  echo: string;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
