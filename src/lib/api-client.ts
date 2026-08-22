import type {
  Task, CalendarEvent, Habit, Category, AppNotification, PublicUser,
  UserSettings, AnalyticsPayload, AiParseResult,
} from './types';

/**
 * عميل الـ API الموحّد.
 * كل نداء من الواجهة يمر من هنا: معالجة أخطاء موحّدة، رسائل عربية،
 * وأنواع صارمة. لا يوجد أي `fetch` مباشر في المكوّنات.
 */

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      credentials: 'same-origin',
    });
  } catch {
    throw new ApiError(0, 'network', 'تعذّر الاتصال بالخادم. تحقّق من اتصالك بالإنترنت.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  const data = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new ApiError(
      response.status,
      data.error ?? 'error',
      data.message ?? 'حدث خطأ غير متوقع.',
      data.details,
    );
  }
  return data as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T>(path: string, body?: unknown) =>
  request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });
const patch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(body) });
const del = <T>(path: string) => request<T>(path, { method: 'DELETE' });

function qs(params: Record<string, string | number | undefined | null>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
}

export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string; timezone?: string }) =>
      post<{ user: PublicUser }>('/auth/register', body),
    login: (body: { email: string; password: string }) => post<{ user: PublicUser }>('/auth/login', body),
    logout: () => post<{ success: boolean }>('/auth/logout'),
    me: () => get<{ user: PublicUser; settings: UserSettings }>('/auth/me'),
    forgotPassword: (email: string) => post<{ message: string }>('/auth/forgot-password', { email }),
    resetPassword: (token: string, password: string) =>
      post<{ message: string }>('/auth/reset-password', { token, password }),
    verifyEmail: (token: string) => post<{ message: string }>('/auth/verify-email', { token }),
    resendVerification: () => request<{ message: string }>('/auth/verify-email', { method: 'PUT' }),
    changePassword: (currentPassword: string, newPassword: string) =>
      post<{ message: string }>('/auth/change-password', { currentPassword, newPassword }),
  },

  tasks: {
    list: (params: Record<string, string | number | undefined> = {}) =>
      get<{ tasks: Task[]; count: number }>(`/tasks${qs(params)}`),
    get: (id: string) => get<{ task: Task }>(`/tasks/${id}`),
    create: (body: unknown) => post<{ task: Task }>('/tasks', body),
    update: (id: string, body: unknown) => patch<{ task: Task }>(`/tasks/${id}`, body),
    remove: (id: string) => del<{ success: boolean }>(`/tasks/${id}`),
    complete: (id: string, completed: boolean) =>
      post<{ task: Task }>(`/tasks/${id}/complete`, { completed }),
    reschedule: (id: string, date: string, time?: string | null) =>
      post<{ task: Task }>(`/tasks/${id}/reschedule`, { date, time }),
  },

  events: {
    list: (params: Record<string, string | undefined> = {}) =>
      get<{ events: CalendarEvent[] }>(`/events${qs(params)}`),
    create: (body: unknown) => post<{ event: CalendarEvent }>('/events', body),
    update: (id: string, body: unknown) => patch<{ event: CalendarEvent }>(`/events/${id}`, body),
    remove: (id: string) => del<{ success: boolean }>(`/events/${id}`),
  },

  habits: {
    list: () => get<{ habits: Habit[] }>('/habits'),
    create: (body: unknown) => post<{ habit: Habit }>('/habits', body),
    update: (id: string, body: unknown) => patch<{ habit: Habit }>(`/habits/${id}`, body),
    remove: (id: string) => del<{ success: boolean }>(`/habits/${id}`),
    log: (id: string, date: string, completed: boolean) =>
      post<{ habit: Habit }>(`/habits/${id}/log`, { date, completed }),
  },

  categories: {
    list: () => get<{ categories: Category[] }>('/categories'),
    create: (body: { name: string; color?: string; icon?: string }) =>
      post<{ category: Category }>('/categories', body),
    update: (id: string, body: unknown) => patch<{ category: Category }>(`/categories/${id}`, body),
    remove: (id: string) => del<{ success: boolean }>(`/categories/${id}`),
  },

  notifications: {
    list: () => get<{ notifications: AppNotification[]; unread: number }>('/notifications'),
    due: () =>
      get<{ reminders: { id: string; title: string; body: string; link: string }[]; unread: number }>(
        '/notifications/due',
      ),
    markRead: (id: string) => post<{ unread: number }>(`/notifications/${id}`),
    markAllRead: () => post<{ unread: number }>('/notifications/read-all'),
    remove: (id: string) => del<{ unread: number }>(`/notifications/${id}`),
    clear: () => del<{ deleted: number }>('/notifications'),
  },

  push: {
    vapid: () => get<{ configured: boolean; publicKey: string | null }>('/push/vapid'),
    subscribe: (subscription: PushSubscriptionJSON) => post<{ success: boolean }>('/push/subscribe', subscription),
    test: () => post<{ message: string; pushConfigured: boolean; devices: number }>('/push/test'),
  },

  settings: {
    get: () => get<{ settings: UserSettings }>('/settings'),
    update: (body: Partial<UserSettings>) => patch<{ settings: UserSettings }>('/settings', body),
  },

  profile: {
    update: (body: { name?: string; avatarUrl?: string | null; timezone?: string }) =>
      patch<{ user: PublicUser }>('/profile', body),
    remove: () => del<{ success: boolean }>('/profile'),
  },

  analytics: {
    get: (days = 30) => get<{ analytics: AnalyticsPayload }>(`/analytics${qs({ days })}`),
  },

  ai: {
    parse: (text: string) =>
      post<{ result: AiParseResult; provider: { provider: string; mode: string } }>('/ai/parse', { text }),
    create: (kind: 'task' | 'event' | 'habit', payload: unknown, categoryName?: string | null) =>
      post<{ task?: Task; event?: CalendarEvent; habit?: Habit }>('/ai/create', {
        kind,
        payload,
        categoryName,
      }),
  },

  search: (params: Record<string, string | undefined>) =>
    get<{ tasks: Task[]; events: CalendarEvent[]; habits: Habit[]; categories: Category[]; total: number }>(
      `/search${qs(params)}`,
    ),

  suggestions: () =>
    get<{
      tasks: Task[];
      suggestions: { date: string; time: string; label: string }[];
      enabled: boolean;
    }>('/suggestions'),
};

interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}
