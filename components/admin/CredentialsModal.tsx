'use client';

import { useEffect, useState } from 'react';
import { Copy, MessageCircle } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { SITE_NAME } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { copyText } from './clipboard';
import type { LoginCredentials } from './types';

function loginUrl(role: 'lister' | 'admin', origin: string): string {
  return role === 'admin' ? `${origin}/admin/login` : `${origin}/lister`;
}

function loginMessage(c: LoginCredentials, origin: string): string {
  return [
    `Welcome to ${SITE_NAME}!`,
    '',
    `Login page: ${loginUrl(c.role, origin)}`,
    `Email: ${c.email}`,
    `Password: ${c.password}`,
    '',
    'Please sign in and keep these details private.',
  ].join('\n');
}

export function CredentialsModal({
  credentials,
  onClose,
  title,
  showWhatsApp = false,
}: {
  credentials: LoginCredentials | null;
  onClose: () => void;
  title: string;
  showWhatsApp?: boolean;
}) {
  const { toast } = useToast();
  const [origin, setOrigin] = useState('');
  useEffect(() => setOrigin(window.location.origin), []);

  async function copy(text: string, what: string) {
    const ok = await copyText(text);
    toast(ok ? { title: `${what} copied`, variant: 'success' } : { title: 'Could not copy', description: 'Select the text and copy it manually.', variant: 'error' });
  }

  const c = credentials;
  const message = c ? loginMessage(c, origin) : '';
  const digits = c ? c.phone.replace(/\D/g, '') : '';
  const waHref = digits ? `https://wa.me/${digits}?text=${encodeURIComponent(message)}` : null;

  return (
    <Modal
      open={Boolean(c)}
      onClose={onClose}
      title={title}
      description="Copy these details now. The password is shown only once."
      dismissible={false}
      size="md"
      footer={<Button type="button" onClick={onClose}>Done</Button>}
    >
      {c && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-warning/40 bg-warning/10 p-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Name</dt>
                <dd className="font-medium">{c.name}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Login page</dt>
                <dd className="break-all">{loginUrl(c.role, origin)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
                <dd className="break-all">{c.email}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Password</dt>
                <dd className="flex items-center justify-between gap-2">
                  <code className="select-all break-all rounded-lg bg-background px-2 py-1 font-mono text-base font-semibold">{c.password}</code>
                  <Button type="button" variant="outline" size="sm" onClick={() => copy(c.password, 'Password')} aria-label="Copy password">
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button type="button" variant="secondary" onClick={() => copy(message, 'Login message')}>
              <Copy className="h-4 w-4" aria-hidden="true" />
              Copy login message
            </Button>
            {showWhatsApp && waHref && (
              <a href={waHref} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline' }))}>
                <MessageCircle className="h-4 w-4" aria-hidden="true" />
                Share on WhatsApp
              </a>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
