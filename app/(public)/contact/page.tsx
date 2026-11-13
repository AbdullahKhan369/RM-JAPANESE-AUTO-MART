import type { Metadata } from 'next';
import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { whatsappLink } from '@/lib/format';
import { getSiteContent, t } from '@/lib/site-content';
import { buttonVariants } from '@/components/ui/Button';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: t(content, 'contact_title'), description: t(content, 'contact_text') };
}

export default async function ContactPage() {
  const content = await getSiteContent();
  const email = t(content, 'contact_email').trim();
  const phone = t(content, 'contact_phone').trim();
  const whatsapp = t(content, 'contact_whatsapp').trim();
  const address = t(content, 'contact_address').trim();
  const hours = t(content, 'contact_hours').trim();

  const items = [
    email && { icon: Mail, label: 'Email', value: email, href: `mailto:${email}` },
    phone && { icon: Phone, label: 'Phone', value: phone, href: `tel:${phone.replace(/\s+/g, '')}` },
    whatsapp && { icon: MessageCircle, label: 'WhatsApp', value: whatsapp, href: whatsappLink(whatsapp) },
    address && { icon: MapPin, label: 'Address', value: address, href: '' },
    hours && { icon: Clock, label: 'Opening hours', value: hours, href: '' },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href: string }[];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">{t(content, 'contact_title')}</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted-foreground">{t(content, 'contact_text')}</p>

      {items.length > 0 ? (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {items.map(({ icon: Icon, label, value, href }) => {
            const body = (
              <>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-muted-foreground">{label}</span>
                  <span className="block whitespace-pre-line break-words font-semibold text-foreground">{value}</span>
                </span>
              </>
            );
            return (
              <li key={label}>
                {href ? (
                  <a
                    href={href}
                    {...(label === 'WhatsApp' ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary hover:shadow-lift focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {body}
                  </a>
                ) : (
                  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-soft">{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-8 rounded-2xl border border-dashed border-border bg-card px-6 py-10 text-center text-muted-foreground">
          Our contact details will be added soon. Meanwhile, open any car and contact the RM representative listed on it.
        </p>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/cars" className={buttonVariants({ variant: 'primary', size: 'lg' })}>
          Browse cars
        </Link>
        <Link href="/list-your-car" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
          List your car
        </Link>
      </div>
    </div>
  );
}
