'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ActionMenuItem {
  key: string;
  label: string;
  icon?: ReactNode;
  href?: string;
  external?: boolean;
  danger?: boolean;
  disabled?: boolean;
  onSelect?: () => void;
}

interface ActionMenuProps {
  label: string;
  items: ActionMenuItem[];
  disabled?: boolean;
}

/** Small dropdown. Uses fixed positioning so it is never clipped by scrolling table containers. */
export function ActionMenu({ label, items, disabled }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const close = useCallback(() => setOpen(false), []);

  function toggle() {
    if (open) {
      setOpen(false);
      return;
    }
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      const menuHeight = items.length * 40 + 16;
      const below = window.innerHeight - rect.bottom;
      const top = below >= menuHeight ? rect.bottom + 4 : Math.max(8, rect.top - menuHeight - 4);
      setPos({ top, right: Math.max(8, window.innerWidth - rect.right) });
    }
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus();
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [open, close]);

  const itemClass = (item: ActionMenuItem) =>
    cn(
      'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 ring-ring',
      item.danger ? 'text-danger hover:bg-danger/10' : 'text-foreground hover:bg-muted',
      item.disabled && 'pointer-events-none opacity-50',
    );

  function onMenuKeyDown(e: ReactKeyboardEvent<HTMLDivElement>) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const nodes = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const nextIndex = e.key === 'ArrowDown' ? (index + 1) % nodes.length : (index - 1 + nodes.length) % nodes.length;
    nodes[nextIndex]?.focus();
  }

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn(
          'inline-flex h-9 items-center gap-1 rounded-xl border border-border bg-card px-3 text-sm font-medium text-foreground',
          'transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:opacity-50',
        )}
      >
        {label}
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && pos && (
        <div
          ref={menuRef}
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-50 w-56 rounded-xl border border-border bg-card p-1 shadow-lg"
        >
          {items.map((item) =>
            item.href ? (
              <Link
                key={item.key}
                href={item.href}
                role="menuitem"
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                onClick={close}
                className={itemClass(item)}
              >
                {item.icon}
                {item.label}
              </Link>
            ) : (
              <button
                key={item.key}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  close();
                  item.onSelect?.();
                }}
                className={itemClass(item)}
              >
                {item.icon}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}
