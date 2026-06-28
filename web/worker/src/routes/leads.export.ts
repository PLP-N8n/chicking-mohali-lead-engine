import type { Env } from '../index';
import * as XLSX from 'xlsx';

interface Lead {
  id: string;
  type: string;
  name: string;
  phone: string;
  city: string | null;
  investment: string | null;
  status: string;
  notes: string | null;
  created_at: number;
  updated_at: number;
  email: string | null;
  property: string | null;
  format: string | null;
  background: string | null;
  experience: string | null;
  campaign: string | null;
  referral_code: string | null;
  referred_by: string | null;
  instagram: string | null;
  whatsapp_optin: number | null;
  score: number | null;
  tier: string | null;
  priority_action: string | null;
  audit_status: string | null;
}

/** Neutralise spreadsheet formula injection: a cell starting with = + - @ (or tab/CR)
 *  is treated as a formula by Excel/Sheets. Prefix with a single quote to force text. */
function safeCell(v: string | number | null): string | number {
  if (typeof v === 'number') return v;
  const s = v ?? '';
  return /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
}

export async function handleExport(_request: Request, env: Env): Promise<Response> {
  const { results } = await env.DB.prepare(
    'SELECT * FROM leads ORDER BY created_at DESC LIMIT 10000'
  ).all<Lead>();

  const rows = (results as Lead[]).map(l => ({
    ID: l.id,
    Type: l.type.toUpperCase(),
    Name: safeCell(l.name),
    Phone: safeCell(l.phone),
    Email: safeCell(l.email),
    City: safeCell(l.city),
    Tier: l.tier ?? '',
    Score: l.score ?? '',
    'Priority Action': safeCell(l.priority_action),
    'Audit': l.audit_status ?? '',
    Status: l.status,
    Investment: safeCell(l.investment),
    Property: safeCell(l.property),
    Format: safeCell(l.format),
    Background: safeCell(l.background),
    Experience: safeCell(l.experience),
    Campaign: safeCell(l.campaign),
    'Referral Code': safeCell(l.referral_code),
    'Referred By': safeCell(l.referred_by),
    Instagram: safeCell(l.instagram),
    'WhatsApp Opt-in': l.whatsapp_optin ? 'Yes' : 'No',
    Notes: safeCell(l.notes),
    'Submitted At': new Date(l.created_at * 1000).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Leads');

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  const filename = `chicking-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
