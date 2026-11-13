'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Field } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';

export interface OwnerOption {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
}

export function OwnerCard({ carId, ownerId, listers }: { carId: string; ownerId: string; listers: OwnerOption[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = useState(ownerId);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => setSelected(ownerId), [ownerId]);

  const owner = listers.find((l) => l.id === ownerId);
  const target = listers.find((l) => l.id === selected);
  const options = listers.filter((l) => l.is_active || l.id === ownerId);
  const label = (l: OwnerOption) => `${l.full_name || l.email} (${l.email})`;

  async function changeOwner() {
    setSaving(true);
    try {
      const { data, error } = await createClient().from('cars').update({ lister_id: selected }).eq('id', carId).select('id');
      if (error || !data || data.length === 0) throw new Error('The owner could not be changed.');
      toast({ title: 'Owner changed', variant: 'success' });
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast({ title: 'Could not change the owner', description: err instanceof Error ? err.message : undefined, variant: 'error' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Owner</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm">
          {owner ? (
            <>
              <span className="font-medium">{owner.full_name || owner.email}</span>
              <span className="text-muted-foreground"> · {owner.email}</span>
            </>
          ) : (
            <span className="text-muted-foreground">Unknown owner</span>
          )}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <Field label="Change owner" htmlFor="owner-select">
              <Select id="owner-select" value={selected} onChange={(e) => setSelected(e.target.value)}>
                {options.map((l) => (
                  <option key={l.id} value={l.id}>{label(l)}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Button type="button" variant="outline" disabled={selected === ownerId} onClick={() => setConfirmOpen(true)}>
            Change owner
          </Button>
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmOpen}
        title="Change the owner of this car?"
        description={`The car will move to ${target ? target.full_name || target.email : 'the selected lister'}. Unsaved changes in the form below will be lost.`}
        confirmLabel="Change owner"
        loading={saving}
        onConfirm={() => void changeOwner()}
        onCancel={() => setConfirmOpen(false)}
      />
    </Card>
  );
}
