import Link from 'next/link';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { DELIVER_TO_OPTIONS } from '@/lib/constants';
import { whatsappLink } from '@/lib/format';
import { t } from '@/lib/site-content';
import { Logo } from '@/components/layout/Logo';

const QUICK_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/cars', label: 'Cars' },
  { href: '/list-your-car', label: 'List your car' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Footer({ content }: { content: Record<string, string> }) {
  const siteName = t(content, 'site_name');
  const email = t(content, 'contact_email').trim();
  const phone = t(content, 'contact_phone').trim();
  const whatsapp = t(content, 'contact_whatsapp').trim();
  const address = t(content, 'contact_address').trim();
  const hours = t(content, 'contact_hours').trim();
  const hasContact = Boolean(email || phone || whatsapp || address || hours);
  const copyright = t(content, 'footer_copyright').replace('{year}', String(new Date().getFullYear()));

  return (
    <footer className="mt-16 border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Logo size="md" name={siteName} />
            <p className="max-w-xs text-sm text-muted-foreground">{t(content, 'footer_about')}</p>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Quick links</h2>
            <ul className="mt-4 space-y-2.5">
              {QUICK_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground transition-colors hover:text-primary">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">Contact</h2>
            {hasContact ? (
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {email ? (
                  <li className="flex items-start gap-2.5">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`mailto:${email}`} className="break-all transition-colors hover:text-primary">
                      {email}
                    </a>
                  </li>
                ) : null}
                {phone ? (
                  <li className="flex items-start gap-2.5">
                    <Phone className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="transition-colors hover:text-primary">
                      {phone}
                    </a>
                  </li>
                ) : null}
                {whatsapp ? (
                  <li className="flex items-start gap-2.5">
                    <MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <a
                      href={whatsappLink(whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="transition-colors hover:text-primary"
                    >
                      WhatsApp {whatsapp}
                    </a>
                  </li>
                ) : null}
                {address ? (
                  <li className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="whitespace-pre-line">{address}</span>
                  </li>
                ) : null}
                {hours ? (
                  <li className="flex items-start gap-2.5">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span>{hours}</span>
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">
                Contact the representative listed on each car, or send us a message from the contact page.
              </p>
            )}
          </div>

          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-foreground">We deliver to</h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {DELIVER_TO_OPTIONS.map((option) => (
                <li
                  key={option.value}
                  className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground"
                >
                  {option.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{copyright}</p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <a
              href="https://www.exchangerate-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-primary"
            >
              Exchange rates by ExchangeRate-API
            </a>
            <Link href="/lister" className="transition-colors hover:text-primary">
              Seller login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
