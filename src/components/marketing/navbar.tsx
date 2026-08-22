'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';

const links = [
  { label: 'المميزات', href: '#features' },
  { label: 'كيف تعمل', href: '#how' },
  { label: 'التذكيرات', href: '#reminders' },
  { label: 'المساعد الذكي', href: '#ai' },
  { label: 'الأسئلة', href: '#faq' },
];

export function Navbar({ loggedIn = false }: { loggedIn?: boolean }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-40 transition-all duration-300',
        scrolled ? 'border-b border-line bg-bg/85 backdrop-blur-xl' : 'border-b border-transparent',
      )}
    >
      <nav className="container-app flex h-16 items-center justify-between gap-4" aria-label="الرئيسية">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          {loggedIn ? (
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm shadow-brand/25 transition-all hover:bg-brand-strong"
            >
              لوحة التحكم
              <ArrowLeft className="h-4 w-4" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-4 py-2 text-sm font-semibold text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-5 text-sm font-semibold text-brand-fg shadow-sm shadow-brand/25 transition-all hover:bg-brand-strong"
              >
                ابدأ الآن
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>

        <button
          className="rounded-xl p-2.5 text-fg transition-colors hover:bg-fg/5 lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'إغلاق القائمة' : 'فتح القائمة'}
          aria-expanded={open}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </nav>

      {open && (
        <div className="animate-fade-in border-t border-line bg-bg lg:hidden">
          <div className="container-app space-y-1 py-4">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-4 py-3 text-[15px] font-medium text-muted transition-colors hover:bg-fg/5 hover:text-fg"
              >
                {link.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-2 pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-line text-sm font-semibold"
              >
                تسجيل الدخول
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-brand-fg"
              >
                ابدأ مجانًا
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
