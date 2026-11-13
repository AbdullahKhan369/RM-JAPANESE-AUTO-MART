'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Coins,
  FileText,
  Globe,
  Inbox,
  LayoutDashboard,
  Car,
  Menu,
  PlusCircle,
  ShieldCheck,
  Tags,
  UserCircle,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/layout/Logo';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { SignOutButton } from '@/components/auth/SignOutButton';

export type PortalIcon =
  | 'dashboard'
  | 'cars'
  | 'add'
  | 'users'
  | 'shield'
  | 'requests'
  | 'content'
  | 'catalog'
  | 'rates'
  | 'profile';

const ICONS: Record<PortalIcon, LucideIcon> = {
  dashboard: LayoutDashboard,
  cars: Car,
  add: PlusCircle,
  users: Users,
  shield: ShieldCheck,
  requests: Inbox,
  content: FileText,
  catalog: Tags,
  rates: Coins,
  profile: UserCircle,
};

export interface PortalNavItem {
  href: string;
  label: string;
  icon: PortalIcon;
  badge?: number;
}

export interface PortalShellProps {
  title: 'Seller Portal' | 'Admin Panel';
  nav: PortalNavItem[];
  user: { name: string; email: string };
  signOutRedirect: string;
  children: ReactNode;
}

function initials(name: string, email: string): string {
  const source = (name || email || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : source.slice(0, 2);
  return letters.toUpperCase();
}

export function PortalShell({ title, nav, user, signOutRedirect, children }: PortalShellProps) {
  const pathname = usePathname() ?? '';
  const [drawerOpen, setDrawerOpen] = useState(false);

  // The most specific matching item is the active one (so /x/cars/new does not also light up /x/cars).
  const activeHref = nav
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setDrawerOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [drawerOpen]);

  const navList = (
    <nav aria-label={`${title} navigation`} className="flex flex-col gap-1">
      {nav.map((item) => {
        const Icon = ICONS[item.icon];
        const active = item.href === activeHref;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge && item.badge > 0 ? (
              <span
                className={cn(
                  'inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-bold',
                  active ? 'bg-primary-foreground text-primary' : 'bg-primary text-primary-foreground',
                )}
              >
                {item.badge > 99 ? '99+' : item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3">
      <Logo size="sm" showName={false} href="/" />
      <div className="min-w-0">
        <p className="truncate text-sm font-bold leading-tight text-foreground">RM Japanese Auto Mart</p>
        <p className="text-xs font-medium text-primary">{title}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/40">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border p-4">{brand}</div>
        <div className="flex-1 overflow-y-auto p-3 scrollbar-thin">{navList}</div>
        <div className="border-t border-border p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Globe className="h-[18px] w-[18px]" aria-hidden="true" />
            View website
          </Link>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            aria-hidden="true"
            className="absolute inset-0 animate-fade-in bg-foreground/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] animate-fade-in flex-col border-r border-border bg-card shadow-lift">
            <div className="flex items-center justify-between border-b border-border p-4">
              {brand}
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">{navList}</div>
            <div className="border-t border-border p-3">
              <Link
                href="/"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <Globe className="h-[18px] w-[18px]" aria-hidden="true" />
                View website
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <button
            type="button"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
          <p className="truncate text-sm font-semibold text-foreground lg:hidden">{title}</p>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href="/"
              className="hidden h-10 items-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:inline-flex"
            >
              <Globe className="h-4 w-4" aria-hidden="true" />
              View website
            </Link>
            <ThemeToggle />
            <UserMenu name={user.name} email={user.email} signOutRedirect={signOutRedirect} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}

function UserMenu({ name, email, signOutRedirect }: { name: string; email: string; signOutRedirect: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        {initials(name, email)}
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 animate-fade-in rounded-2xl border border-border bg-card p-2 shadow-lift"
        >
          <div className="border-b border-border px-3 pb-3 pt-2">
            <p className="truncate text-sm font-semibold text-foreground">{name || 'Signed in'}</p>
            <p className="truncate text-xs text-muted-foreground">{email}</p>
          </div>
          <div className="pt-2">
            <SignOutButton redirectTo={signOutRedirect} className="w-full text-danger hover:bg-danger/10" />
          </div>
        </div>
      ) : null}
    </div>
  );
}
