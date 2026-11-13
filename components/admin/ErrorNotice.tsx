import { AlertTriangle } from 'lucide-react';

export function ErrorNotice({
  title = 'Could not load this data',
  message = 'Please refresh the page. If it keeps happening, check that your Supabase project is not paused (free projects pause after about a week without activity).',
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div role="alert" className="flex gap-3 rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden="true" />
      <div>
        <p className="font-semibold text-danger">{title}</p>
        <p className="mt-1 text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
