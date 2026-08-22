'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, ListChecks, CalendarDays, Target, BarChart3, Bell, Settings,
  User, LogOut, Plus, Search, Menu, X, Sparkles, Moon, Sun, Monitor,
} from 'lucide-react';
import { Logo, LogoMark } from '@/components/marketing/logo';
import { CreditLine } from '@/components/marketing/footer';
import { Dropdown, DropdownItem } from '@/components/ui/primitives';
import { useToast } from '@/components/ui/toast';
import { api } from '@/lib/api-client';
import { cn, initials } from '@/lib/utils';
import type { PublicUser, ThemeMode } from '@/lib/types';

const navigation = [
  { href: '/dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
  { href: '/tasks', label: 'المهام', icon: ListChecks },
  { href: '/calendar', label: 'التقويم', icon: CalendarDays },
  { href: '/habits', label: 'العادات', icon: Target },
  { href: '/analytics', label: 'الإحصائيات', icon: BarChart3 },
  { href: '/notifications', label: 'الإشعارات', icon: Bell },
];

const bottomNavigation = [
  { href: '/settings', label: 'الإعدادات', icon: Settings },
  { href: '/profile', label: 'الملف الشخصي', icon: User },
];

/** التنقّل السفلي على الجوال — أهم ٥ وجهات */
const mobileNavigation = [
  { href: '/dashboard', label: 'الرئيسية', icon: LayoutDashboard },
  { href: '/tasks', label: 'المهام', icon: ListChecks },
  { href: '/calendar', label: 'التقويم', icon: CalendarDays },
  { href: '/habits', label: 'العادات', icon: Target },
  { href: '/analytics', label: 'الإحصائيات', icon: BarChart3 },
];

export function AppShell({
  user,
  unreadCount,
  children,
  onQuickAdd,
  onOpenAi,
  onOpenSearch,
}: {
  user: PublicUser;
  unreadCount: number;
  children: React.ReactNode;
  onQuickAdd: () => void;
  onOpenAi: () => void;
  onOpenSearch: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>('system');

  useEffect(() => {
    setTheme((localStorage.getItem('nabbihni-theme') as ThemeMode) || 'system');
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function applyTheme(mode: ThemeMode) {
    setTheme(mode);
    localStorage.setItem('nabbihni-theme', mode);
    const dark =
      mode === 'dark' ||
      (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    void api.settings.update({ theme: mode }).catch(() => {});
  }

  async function logout() {
    try {
      await api.auth.logout();
      toast.success('تم تسجيل الخروج');
      router.push('/login');
      router.refresh();
    } catch {
      toast.error('تعذّر تسجيل الخروج');
    }
  }

  const NavLinks = ({ items }: { items: typeof navigation }) => (
    <>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-all',
              active ? 'bg-brand/10 text-brand' : 'text-muted hover:bg-fg/5 hover:text-fg',
            )}
          >
            {active && (
              <span className="absolute right-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-l-full bg-brand" />
            )}
            <item.icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1">{item.label}</span>
            {item.href === '/notifications' && unreadCount > 0 && (
              <span className="num flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-[10px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        );
      })}
    </>
  );

  const sidebarContent = (
    <>
      <div className="flex h-16 items-center justify-between px-5">
        <Logo href="/dashboard" />
        <button
          className="rounded-lg p-2 text-muted hover:bg-fg/5 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="إغلاق القائمة"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-2 px-3 pb-4">
        <button
          onClick={() => {
            onQuickAdd();
            setMobileOpen(false);
          }}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[15px] font-bold text-brand-fg shadow-sm shadow-brand/25 transition-all hover:bg-brand-strong active:scale-[.98]"
        >
          <Plus className="h-4.5 w-4.5" />
          إضافة مهمة
        </button>
        <button
          onClick={() => {
            onOpenAi();
            setMobileOpen(false);
          }}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-brand/25 bg-brand/8 text-sm font-semibold text-brand transition-colors hover:bg-brand/12"
        >
          <Sparkles className="h-4 w-4" />
          المساعد الذكي
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
        <NavLinks items={navigation} />
        <div className="my-3 border-t border-line" />
        <NavLinks items={bottomNavigation} />
      </nav>

      <div className="border-t border-line p-3">
        <div className="mb-2 flex items-center gap-1 rounded-xl bg-elevated p-1">
          {(
            [
              { value: 'light', icon: Sun, label: 'فاتح' },
              { value: 'dark', icon: Moon, label: 'داكن' },
              { value: 'system', icon: Monitor, label: 'النظام' },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              onClick={() => applyTheme(option.value)}
              title={option.label}
              aria-label={option.label}
              className={cn(
                'flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors',
                theme === option.value ? 'bg-surface text-brand shadow-soft' : 'text-muted hover:text-fg',
              )}
            >
              <option.icon className="h-4 w-4" />
            </button>
          ))}
        </div>

        <Dropdown
          align="end"
          trigger={
            <button className="flex w-full items-center gap-3 rounded-xl p-2 text-right transition-colors hover:bg-fg/5">
              <Avatar user={user} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{user.name}</p>
                <p className="truncate text-[11px] text-muted" dir="ltr">
                  {user.email}
                </p>
              </div>
            </button>
          }
        >
          {(close) => (
            <>
              <DropdownItem icon={<User className="h-4 w-4" />} onClick={() => { close(); router.push('/profile'); }}>
                الملف الشخصي
              </DropdownItem>
              <DropdownItem icon={<Settings className="h-4 w-4" />} onClick={() => { close(); router.push('/settings'); }}>
                الإعدادات
              </DropdownItem>
              <div className="my-1 border-t border-line" />
              <DropdownItem danger icon={<LogOut className="h-4 w-4" />} onClick={logout}>
                تسجيل الخروج
              </DropdownItem>
            </>
          )}
        </Dropdown>

        <CreditLine className="mt-3 text-center" />
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-bg">
      {/* الشريط الجانبي — سطح المكتب */}
      <aside className="fixed inset-y-0 right-0 z-30 hidden w-[264px] flex-col border-l border-line bg-surface lg:flex">
        {sidebarContent}
      </aside>

      {/* الشريط الجانبي — الجوال */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-[280px] flex-col border-l border-line bg-surface animate-fade-in">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* المحتوى */}
      <div className="lg:pr-[264px]">
        {/* الشريط العلوي */}
        <header className="sticky top-0 z-20 border-b border-line bg-bg/85 backdrop-blur-xl">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <button
              className="rounded-xl p-2.5 text-fg transition-colors hover:bg-fg/5 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="فتح القائمة"
            >
              <Menu className="h-5 w-5" />
            </button>

            <Link href="/dashboard" className="lg:hidden">
              <LogoMark />
            </Link>

            <button
              onClick={onOpenSearch}
              className="flex h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 text-right text-sm text-faint transition-colors hover:border-brand/30 sm:max-w-md"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="min-w-0 flex-1 truncate">ابحث في المهام والمواعيد والعادات…</span>
              <kbd className="hidden rounded border border-line px-1.5 py-0.5 text-[10px] font-sans text-muted sm:block">
                /
              </kbd>
            </button>

            <div className="mr-auto flex items-center gap-1.5">
              <button
                onClick={onOpenAi}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand/10 sm:hidden"
                aria-label="المساعد الذكي"
              >
                <Sparkles className="h-5 w-5" />
              </button>
              <Link
                href="/notifications"
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted transition-colors hover:bg-fg/5 hover:text-fg"
                aria-label={`الإشعارات${unreadCount ? ` (${unreadCount} غير مقروء)` : ''}`}
              >
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute right-2 top-2 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
                  </span>
                )}
              </Link>
              <button
                onClick={onQuickAdd}
                className="hidden h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-bold text-brand-fg transition-all hover:bg-brand-strong active:scale-[.98] sm:flex lg:hidden"
              >
                <Plus className="h-4 w-4" />
                مهمة
              </button>
            </div>
          </div>
        </header>

        <main className="px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>
      </div>

      {/* التنقّل السفلي — الجوال */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-xl lg:hidden">
        <div className="flex items-stretch justify-around px-1 pb-[env(safe-area-inset-bottom)]">
          {mobileNavigation.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition-colors',
                  active ? 'text-brand' : 'text-muted',
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* زر الإضافة العائم — الجوال */}
      <button
        onClick={onQuickAdd}
        className="fixed bottom-20 left-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-brand-fg shadow-lift transition-transform active:scale-95 lg:hidden"
        aria-label="إضافة مهمة"
      >
        <Plus className="h-6 w-6" />
      </button>
    </div>
  );
}

export function Avatar({ user, size = 36 }: { user: PublicUser; size?: number }) {
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.avatarUrl}
        alt={user.name}
        width={size}
        height={size}
        className="shrink-0 rounded-xl object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden
    >
      {initials(user.name)}
    </span>
  );
}
