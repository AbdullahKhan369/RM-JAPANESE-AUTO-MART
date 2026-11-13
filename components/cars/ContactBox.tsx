'use client';

import { Mail, MessageCircle, Phone, Share2 } from 'lucide-react';
import { whatsappLink } from '@/lib/format';
import { buttonVariants } from '@/components/ui/Button';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export interface ContactPerson {
  name: string;
  city: string;
  phone: string;
  email: string;
}

export function ContactBox({
  title,
  person,
  carTitle,
  pageUrl,
  disclaimer,
}: {
  title: string;
  person: ContactPerson | null;
  carTitle: string;
  pageUrl: string;
  disclaimer: string;
}) {
  const { toast } = useToast();
  const message = `Hello, I am interested in "${carTitle}". ${pageUrl}`;

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : pageUrl;
    try {
      if (navigator.share) {
        await navigator.share({ title: carTitle, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      toast({ title: 'Link copied', description: 'You can now paste it anywhere.', variant: 'success' });
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      toast({ title: 'Could not copy the link', description: url, variant: 'error' });
    }
  }

  return (
    <aside className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-soft lg:sticky lg:top-24">
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>

      {person ? (
        <>
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary" aria-hidden="true">
              {(person.name || '?').trim().charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-foreground">{person.name}</p>
              {person.city ? <p className="truncate text-sm text-muted-foreground">{person.city}</p> : null}
            </div>
          </div>

          <div className="grid gap-2.5">
            {person.phone ? (
              <a href={`tel:${person.phone}`} className={buttonVariants({ variant: 'primary', size: 'lg', className: 'w-full' })}>
                <Phone className="h-4 w-4" aria-hidden="true" /> Call {person.phone}
              </a>
            ) : null}
            {person.phone ? (
              <a
                href={whatsappLink(person.phone, message)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
              >
                <MessageCircle className="h-4 w-4 text-success" aria-hidden="true" /> WhatsApp
              </a>
            ) : null}
            {person.email ? (
              <a
                href={`mailto:${person.email}?subject=${encodeURIComponent(`Enquiry: ${carTitle}`)}&body=${encodeURIComponent(message)}`}
                className={buttonVariants({ variant: 'outline', size: 'lg', className: 'w-full' })}
              >
                <Mail className="h-4 w-4" aria-hidden="true" /> Email
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Contact details are not available for this car right now. Please use the contact page.
        </p>
      )}

      <Button variant="ghost" size="sm" className="w-full" onClick={share}>
        <Share2 className="h-4 w-4" aria-hidden="true" /> Share or copy link
      </Button>
      {disclaimer ? <p className="border-t border-border pt-3 text-xs text-muted-foreground">{disclaimer}</p> : null}
    </aside>
  );
}
