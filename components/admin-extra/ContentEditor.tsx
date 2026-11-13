'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, ExternalLink, RotateCcw, Save, Search } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { describeError } from '@/lib/car-actions';
import { SITE_CONTENT_DEFAULTS } from '@/lib/site-content-defaults';
import { cn } from '@/lib/utils';
import type { SiteContentRow } from '@/types/database';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/Toast';

interface ContentField {
  key: string;
  label: string;
  group_name: string;
  input_type: 'text' | 'textarea';
  sort_order: number;
  defaultValue: string;
}

const PREFIX_GROUPS: [string, string][] = [
  ['home_', 'Home page'],
  ['cars_', 'Cars page'],
  ['detail_', 'Car detail page'],
  ['list_', 'List your car form'],
  ['lister_', 'Seller portal'],
  ['about_', 'About page'],
  ['contact_', 'Contact'],
  ['footer_', 'Footer'],
  ['seo_', 'SEO'],
  ['site_', 'Brand'],
  ['nav_', 'Navigation'],
];

function humanize(key: string): string {
  const text = key.replace(/_/g, ' ').trim();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function buildFields(rows: SiteContentRow[]): { fields: ContentField[]; values: Record<string, string>; existing: Set<string> } {
  const fields: ContentField[] = [];
  const values: Record<string, string> = {};
  const existing = new Set<string>();
  for (const row of rows) {
    existing.add(row.key);
    values[row.key] = row.value ?? '';
    fields.push({
      key: row.key,
      label: row.label,
      group_name: row.group_name,
      input_type: row.input_type,
      sort_order: row.sort_order,
      defaultValue: SITE_CONTENT_DEFAULTS[row.key] ?? '',
    });
  }
  let extra = 0;
  for (const [key, def] of Object.entries(SITE_CONTENT_DEFAULTS)) {
    if (existing.has(key)) continue;
    const group = PREFIX_GROUPS.find(([prefix]) => key.startsWith(prefix))?.[1] ?? 'Other';
    fields.push({
      key,
      label: humanize(key),
      group_name: group,
      input_type: def.length > 90 || def.includes('\n') ? 'textarea' : 'text',
      sort_order: 10000 + extra,
      defaultValue: def,
    });
    values[key] = def;
    extra += 1;
  }
  return { fields, values, existing };
}

export function ContentEditor({ rows }: { rows: SiteContentRow[] }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { toast } = useToast();

  const initial = useMemo(() => buildFields(rows), [rows]);
  // Rows missing in the database are shown with their defaults and are inserted on the first save.
  const fields = initial.fields;
  const [values, setValues] = useState(initial.values);
  const [saved, setSaved] = useState(initial.values);
  const [existing, setExisting] = useState(initial.existing);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [savingGroup, setSavingGroup] = useState<string | null>(null);

  const groups = useMemo(() => {
    const map = new Map<string, ContentField[]>();
    for (const f of fields) {
      const list = map.get(f.group_name) ?? [];
      list.push(f);
      map.set(f.group_name, list);
    }
    return Array.from(map.entries())
      .map(([name, list]) => ({ name, fields: list.sort((a, b) => a.sort_order - b.sort_order) }))
      .sort((a, b) => a.fields[0].sort_order - b.fields[0].sort_order);
  }, [fields]);

  const needle = query.trim().toLowerCase();
  const visibleGroups = groups
    .map((g) => ({
      ...g,
      fields: needle
        ? g.fields.filter(
            (f) =>
              f.label.toLowerCase().includes(needle) ||
              f.key.toLowerCase().includes(needle) ||
              (values[f.key] ?? '').toLowerCase().includes(needle),
          )
        : g.fields,
    }))
    .filter((g) => g.fields.length > 0);

  const isModified = (key: string) => (values[key] ?? '') !== (saved[key] ?? '');
  const modifiedCount = fields.filter((f) => isModified(f.key)).length;

  useEffect(() => {
    if (modifiedCount === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [modifiedCount]);

  async function saveGroup(groupName: string) {
    const group = groups.find((g) => g.name === groupName);
    if (!group) return;
    const changed = group.fields.filter((f) => isModified(f.key) || !existing.has(f.key));
    if (changed.length === 0) return;
    setSavingGroup(groupName);
    try {
      // The full row is sent so new rows satisfy the NOT NULL columns; for existing rows only `value` differs.
      const payload = changed.map((f) => ({
        key: f.key,
        value: values[f.key] ?? '',
        label: f.label,
        group_name: f.group_name,
        input_type: f.input_type,
        sort_order: f.sort_order,
      }));
      const { error } = await supabase.from('site_content').upsert(payload, { onConflict: 'key' });
      if (error) throw error;
      setSaved((prev) => {
        const next = { ...prev };
        changed.forEach((f) => {
          next[f.key] = values[f.key] ?? '';
        });
        return next;
      });
      setExisting((prev) => new Set([...Array.from(prev), ...changed.map((f) => f.key)]));
      toast({
        title: `${groupName} saved`,
        description: `${changed.length} ${changed.length === 1 ? 'text' : 'texts'} updated on the website.`,
        variant: 'success',
      });
      router.refresh();
    } catch (err) {
      toast({
        title: 'Could not save',
        description: describeError(err, 'Please check your connection and try again.'),
        variant: 'error',
      });
    } finally {
      setSavingGroup(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search texts"
            aria-label="Search website texts"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          {modifiedCount > 0 && (
            <span className="text-sm text-warning" role="status">
              {modifiedCount} unsaved {modifiedCount === 1 ? 'change' : 'changes'}
            </span>
          )}
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-card px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-ring"
          >
            <ExternalLink className="h-4 w-4" aria-hidden="true" /> Preview website
          </a>
        </div>
      </div>

      {visibleGroups.length === 0 ? (
        <EmptyState
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title="No texts found"
          description="Try a different search word."
        />
      ) : (
        visibleGroups.map((group, index) => {
          const isOpen = needle ? true : open[group.name] ?? index === 0;
          const groupModified = group.fields.filter((f) => isModified(f.key)).length;
          const panelId = `content-group-${index}`;
          return (
            <Card key={group.name} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpen((prev) => ({ ...prev, [group.name]: !isOpen }))}
                aria-expanded={isOpen}
                aria-controls={panelId}
                className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 ring-inset ring-ring"
              >
                <span className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{group.name}</span>
                  <span className="text-xs text-muted-foreground">{group.fields.length}</span>
                  {groupModified > 0 && (
                    <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                      {groupModified} modified
                    </span>
                  )}
                </span>
                <ChevronDown
                  className={cn('h-5 w-5 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  aria-hidden="true"
                />
              </button>

              {isOpen && (
                <div id={panelId} className="space-y-5 border-t border-border px-5 py-5">
                  {group.fields.map((f) => {
                    const id = `content-${f.key}`;
                    const modified = isModified(f.key);
                    const atDefault = (values[f.key] ?? '') === f.defaultValue;
                    return (
                      <div key={f.key}>
                        <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                          <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-foreground">
                            {modified && (
                              <span className="h-2 w-2 rounded-full bg-warning" aria-hidden="true" />
                            )}
                            {f.label}
                            {modified && <span className="sr-only">(modified)</span>}
                            {!existing.has(f.key) && (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-normal text-muted-foreground">
                                not saved yet
                              </span>
                            )}
                          </label>
                          <button
                            type="button"
                            onClick={() => setValues((prev) => ({ ...prev, [f.key]: f.defaultValue }))}
                            disabled={atDefault}
                            className="inline-flex items-center gap-1 rounded text-xs font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 ring-ring disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline"
                          >
                            <RotateCcw className="h-3 w-3" aria-hidden="true" /> Reset to default
                          </button>
                        </div>
                        {f.input_type === 'textarea' ? (
                          <Textarea
                            id={id}
                            rows={f.defaultValue.length > 200 || (values[f.key] ?? '').length > 200 ? 8 : 3}
                            value={values[f.key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          />
                        ) : (
                          <Input
                            id={id}
                            value={values[f.key] ?? ''}
                            onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                          />
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          <code>{f.key}</code>
                        </p>
                      </div>
                    );
                  })}
                  <div className="flex justify-end border-t border-border pt-4">
                    <Button
                      type="button"
                      loading={savingGroup === group.name}
                      disabled={
                        group.fields.every((f) => !isModified(f.key) && existing.has(f.key)) || savingGroup !== null
                      }
                      onClick={() => void saveGroup(group.name)}
                    >
                      <Save className="mr-1.5 h-4 w-4" aria-hidden="true" /> Save {group.name}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          );
        })
      )}
    </div>
  );
}
