'use client';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Lead } from '@/lib/api';

function Card({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
      padding: '1rem 1.25rem', minWidth: 120,
    }}>
      <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.25rem' }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', color: '#0f0f0f', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '.8rem', color: '#9ca3af', marginTop: '.2rem' }}>{sub}</div>}
    </div>
  );
}

function last7DaysBuckets(leads: Lead[]) {
  const now = Date.now() / 1000;
  const buckets: { day: string; count: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const start = now - (i + 1) * 86400;
    const end   = now - i * 86400;
    const d     = new Date((now - i * 86400) * 1000);
    buckets.push({
      day: d.toLocaleDateString('en-IN', { weekday: 'short' }),
      count: leads.filter(l => l.created_at >= start && l.created_at < end).length,
    });
  }
  return buckets;
}

export default function StatsBar({ leads }: { leads: Lead[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStart = today.getTime() / 1000;

  const b2c   = leads.filter(l => l.type === 'b2c').length;
  const b2b   = leads.filter(l => l.type === 'b2b').length;
  const todayCount = leads.filter(l => l.created_at >= todayStart).length;

  return (
    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem', alignItems: 'stretch' }}>
      <Card label="Total Leads" value={leads.length} sub="all time" />
      <Card label="Customers (B2C)" value={b2c} />
      <Card label="Franchise (B2B)" value={b2b} />
      <Card label="Today" value={todayCount} />
      <div style={{
        background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12,
        padding: '1rem 1.25rem', flex: '1 1 200px', minWidth: 200,
      }}>
        <div style={{ fontSize: '.75rem', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '.5rem' }}>Last 7 days</div>
        <ResponsiveContainer width="100%" height={50}>
          <BarChart data={last7DaysBuckets(leads)} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
            <Bar dataKey="count" fill="#C8102E" radius={[3, 3, 0, 0]} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8 }}
              formatter={(v: number) => [`${v} lead${v !== 1 ? 's' : ''}`, '']}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
