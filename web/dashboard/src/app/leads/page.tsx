'use client';
import { useEffect, useState, useCallback, type FormEvent } from 'react';
import { ArrowClockwise, DownloadSimple } from '@phosphor-icons/react';
import { toast } from 'sonner';
import StatsBar from '@/components/StatsBar';
import LeadsTable from '@/components/LeadsTable';
import {
  ADMIN_UNAUTHORIZED_EVENT,
  UnauthorizedError,
  downloadExport,
  getAdminToken,
  getLeads,
  setAdminToken,
  type Lead,
} from '@/lib/api';

function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [password, setPassword] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const token = password.trim();
    if (!token) return;
    setAdminToken(token);
    setPassword('');
    onAuthenticated();
  };

  return (
    <div style={{ maxWidth: 420, margin: '12vh auto 0', padding: '1.5rem 1rem' }}>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', boxShadow: '0 10px 30px rgba(15,15,15,.06)' }}>
        <h1 style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#0f0f0f', margin: 0 }}>
          <span style={{ color: '#C8102E' }}>Chicking Mohali</span> — Admin
        </h1>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '.85rem', marginTop: '1.25rem' }}>
          <label style={{ fontSize: '.8rem', fontWeight: 600, color: '#374151' }} htmlFor="admin-password">
            Admin password
          </label>
          <input
            id="admin-password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            autoFocus
            style={{ width: '100%', padding: '.65rem .8rem', border: '1.5px solid #e5e7eb', borderRadius: 8, fontSize: '.95rem' }}
          />
          <button
            type="submit"
            style={{ padding: '.6rem 1rem', border: 'none', borderRadius: 8, background: '#C8102E', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '.9rem' }}
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const [leads, setLeads]       = useState<Lead[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [exporting, setExporting] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);

  const load = useCallback(async () => {
    if (!getAdminToken()) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await getLeads();
      setLeads(data);
      setLastRefresh(new Date());
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      const message = err instanceof Error ? err.message : 'Failed to load leads';
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    setAuthenticated(Boolean(token));
    setAuthReady(true);
    if (!token) setLoading(false);
  }, []);

  useEffect(() => {
    const onUnauthorized = () => {
      setAuthenticated(false);
      setLeads([]);
      setError(null);
      setLoading(false);
      toast.error('Admin password required');
    };

    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, []);

  useEffect(() => {
    if (!authReady || !authenticated) return;
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [authReady, authenticated, load]);

  const handleLeadUpdated = useCallback((id: string, status: Lead['status'], notes: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status, notes } : l));
    toast.success('Lead updated');
  }, []);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      const { url, filename } = await downloadExport();
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filename}`);
    } catch (err) {
      if (err instanceof UnauthorizedError) return;
      const message = err instanceof Error ? err.message : 'Export failed';
      toast.error(message);
    } finally {
      setExporting(false);
    }
  }, []);

  if (!authReady) {
    return (
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem', color: '#6b7280', fontSize: '.9rem' }}>
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return <AdminLogin onAuthenticated={() => { setAuthenticated(true); setLoading(true); }} />;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: '#0f0f0f', margin: 0 }}>
            <span style={{ color: '#C8102E' }}>Chicking Mohali</span> — Leads
          </h1>
          {lastRefresh && !error && (
            <p style={{ fontSize: '.78rem', color: '#9ca3af', margin: '.2rem 0 0' }}>
              Last updated {lastRefresh.toLocaleTimeString('en-IN')} · auto-refreshes every minute
            </p>
          )}
          {error && (
            <p style={{ fontSize: '.78rem', color: '#b91c1c', margin: '.2rem 0 0' }}>
              Live data unavailable — showing last known state
            </p>
          )}
        </div>

        <div style={{ display: 'flex', gap: '.5rem' }}>
          <a
            href="/flow"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .9rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: '.85rem', fontWeight: 600, color: '#0f0f0f', textDecoration: 'none' }}
          >
            🗺 Pipeline Map
          </a>
          <button
            onClick={load}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .9rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', cursor: loading ? 'wait' : 'pointer', fontSize: '.85rem', fontWeight: 600 }}
          >
            <ArrowClockwise size={15} /> Refresh
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .9rem', border: 'none', borderRadius: 8, background: '#C8102E', color: '#fff', cursor: exporting || loading ? 'wait' : 'pointer', fontSize: '.85rem', fontWeight: 600 }}
          >
            <DownloadSimple size={15} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        </div>
      </div>

      {leads.length > 0 && !loading && <StatsBar leads={leads} />}

      <LeadsTable
        leads={leads}
        loading={loading}
        error={error}
        onRefresh={load}
        onUpdated={handleLeadUpdated}
      />
    </div>
  );
}
