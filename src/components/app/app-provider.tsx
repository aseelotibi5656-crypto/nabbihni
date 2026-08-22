'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from './app-shell';
import { TaskModal } from './task-modal';
import { AiAssistant } from './ai-assistant';
import { SearchModal } from './search-modal';
import { ReminderWatcher } from './reminder-watcher';
import { PwaManager } from './pwa';
import type { Category, PublicUser, Task, UserSettings } from '@/lib/types';

/**
 * غلاف التطبيق: يجمع الهيكل والنوافذ المشتركة (إضافة مهمة، المساعد الذكي،
 * البحث) ويوفّرها لكل الصفحات عبر Context، حتى تفتحها أي صفحة بسطر واحد.
 */

interface AppContextValue {
  user: PublicUser;
  settings: UserSettings;
  categories: Category[];
  openTaskModal: (task?: Task | null, initial?: Record<string, unknown> | null) => void;
  openAi: () => void;
  openSearch: () => void;
  refresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp يجب أن يُستخدم داخل AppProvider');
  return ctx;
}

export function AppProvider({
  user,
  settings,
  categories,
  unreadCount,
  children,
}: {
  user: PublicUser;
  settings: UserSettings;
  categories: Category[];
  unreadCount: number;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [taskModal, setTaskModal] = useState<{
    open: boolean;
    task: Task | null;
    initial: Record<string, unknown> | null;
  }>({ open: false, task: null, initial: null });
  const [aiOpen, setAiOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const refresh = useCallback(() => router.refresh(), [router]);

  const openTaskModal = useCallback(
    (task?: Task | null, initial?: Record<string, unknown> | null) =>
      setTaskModal({ open: true, task: task ?? null, initial: initial ?? null }),
    [],
  );

  // اختصارات لوحة المفاتيح: / للبحث، n لمهمة جديدة، a للمساعد
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (typing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === '/') {
        event.preventDefault();
        setSearchOpen(true);
      } else if (event.key === 'n') {
        event.preventDefault();
        openTaskModal();
      } else if (event.key === 'a') {
        event.preventDefault();
        setAiOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openTaskModal]);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      settings,
      categories,
      openTaskModal,
      openAi: () => setAiOpen(true),
      openSearch: () => setSearchOpen(true),
      refresh,
    }),
    [user, settings, categories, openTaskModal, refresh],
  );

  return (
    <AppContext.Provider value={value}>
      <AppShell
        user={user}
        unreadCount={unreadCount}
        onQuickAdd={() => openTaskModal()}
        onOpenAi={() => setAiOpen(true)}
        onOpenSearch={() => setSearchOpen(true)}
      >
        {children}
      </AppShell>

      <TaskModal
        open={taskModal.open}
        onClose={() => setTaskModal({ open: false, task: null, initial: null })}
        onSaved={refresh}
        categories={categories}
        timezone={user.timezone}
        task={taskModal.task}
        initial={taskModal.initial as never}
      />

      <AiAssistant
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onCreated={refresh}
        categories={categories}
      />

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        categories={categories}
        timezone={user.timezone}
      />

      <ReminderWatcher soundEnabled={settings.soundEnabled} />
      <PwaManager pushEnabled={settings.pushEnabled} />
    </AppContext.Provider>
  );
}
