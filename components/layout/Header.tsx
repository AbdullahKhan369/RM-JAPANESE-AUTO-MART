'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, PlusCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { CurrencySwitcher } from '@/components/layout/CurrencySwitcher';
import { ListYourCarButton, type ListRequestContent } from '@/components/list-request/ListRequestModal';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/cars', label: 'Cars' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export interface HeaderProps {
  siteName: string;
  listButtonLabel: string;
  listContent: ListRequestContent;
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}

export function Header({ siteName, listButtonLabel, listContent }: HeaderProps) {
  const pathname = usePathname() ?? '/';
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo size="md" name={siteName} className="min-w-0 [&>span:last-child]:hidden sm:[&>span:last-child]:inline xl:[&>span:last-child]:inline" />

        <nav aria-label="Main navigation" className="ml-6 hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive(pathname, item.href) ? 'page' : undefined}
              className={cn(
                'rounded-xl px-3.5 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive(pathname, item.href)
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <CurrencySwitcher className="hidden sm:block" />
          <ThemeToggle className="hidden sm:inline-flex" />
          <ListYourCarButton
            label={listButtonLabel}
            content={listContent}
            size="md"
            className="hidden sm:inline-flex"
            icon={<PlusCircle className="h-4 w-4" aria-hidden="true" />}
          />
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>

      {menuOpen && typeof document !== 'undefined'
        ? createPortal(
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-fade-in bg-foreground/60 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-80 max-w-[88vw] animate-slide-in-right flex-col border-l border-border bg-card shadow-lift">
            <div className="flex items-center justify-between border-b border-border p-4">
              <Logo size="sm" name={siteName} />
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Mobile navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive(pathname, item.href) ? 'page' : undefined}
                  className={cn(
                    'block rounded-xl px-4 py-3 text-base font-medium transition-colors',
                    isActive(pathname, item.href)
                      ? 'bg-muted text-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="space-y-3 border-t border-border p-4">
              <div className="flex items-center gap-2">
                <CurrencySwitcher className="flex-1 [&>button]:w-full [&>button]:justify-between" />
                <ThemeToggle />
              </div>
              <ListYourCarButton
                label={listButtonLabel}
                content={listContent}
                size="lg"
                className="w-full"
                icon={<PlusCircle className="h-4 w-4" aria-hidden="true" />}
                onOpen={() => setMenuOpen(false)}
              />
            </div>
          </div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}