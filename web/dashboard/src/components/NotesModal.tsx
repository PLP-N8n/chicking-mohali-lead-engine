'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { UnauthorizedError, patchLead, type Lead } from '@/lib/api';

const schema = z.object({
  status: z.enum(['new', 'contacted', 'qualified', 'dropped']),
  notes: z.string().max(500).optional(),
});
type FormData = z.infer<typeof schema>;

const STATUS_LABELS: Record<string, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  dropped: 'Dropped',
};

export default function NotesModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: (id: string, status: string, notes: string) => void;
}) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { status: lead.status, notes: lead.notes ?? '' },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await patchLead(lead.id, { status: data.status, notes: data.notes ?? '' });
      onSaved(lead.id, data.status, data.notes ?? '');
      toast.success('Lead updated');
      onClose();
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      toast.error('Failed to update — try again');
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <h2 style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 800, fontSize: '1.1rem', marginBottom: '.25rem' }}>
          {lead.name}
        </h2>
        <p style={{ fontSize: '.85rem', color: '#6b7280', marginBottom: '1.25rem' }}>
          {lead.phone} {lead.city ? `· ${lead.city}` : ''} {lead.investment ? `· ${lead.investment}` : ''}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '.3rem' }}>Status</label>
            <select
              {...register('status')}
              style={{ width: '100%', padding: '.6rem .75rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', appearance: 'none' }}
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '.3rem' }}>Notes</label>
            <textarea
              {...register('notes')}
              rows={4}
              placeholder="Add notes about this lead…"
              style={{ width: '100%', padding: '.6rem .75rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.9rem', resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '.5rem', justifyContent: 'flex-end', marginTop: '.25rem' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '.55rem 1.1rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: 'pointer', fontSize: '.9rem' }}>
              Cancel
            </button>
            <button type="submit" disabled={isSubmitting}
              style={{ padding: '.55rem 1.25rem', border: 'none', borderRadius: 8, background: '#C8102E', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem', opacity: isSubmitting ? .7 : 1 }}>
              {isSubmitting ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
