const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8787';
const TOKEN_KEY = 'chicking_admin_token';
export const ADMIN_UNAUTHORIZED_EVENT = 'chicking-admin-unauthorized';

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export interface Lead {
  id: string;
  type: 'b2c' | 'b2b';
  name: string;
  phone: string;
  city: string | null;
  investment: string | null;
  status: 'new' | 'contacted' | 'qualified' | 'dropped';
  notes: string | null;
  created_at: number;
  updated_at: number;

  // Additional D1 fields stored for B2B franchise enquiries.
  email: string | null;
  property: string | null;   // own / identified / looking
  format: string | null;     // food-court / dine-in / flexible
  background: string | null; // free text business background
  experience: string | null; // yes-food / yes-retail / no
}

export interface LeadFilters {
  type?: 'b2c' | 'b2b';
  since?: string; // e.g. '24h', '720h'
}

export function getAdminToken(): string {
  if (typeof window === 'undefined') return '';
  return sessionStorage.getItem(TOKEN_KEY) ?? '';
}

export function setAdminToken(token: string): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(TOKEN_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getAdminToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...authHeaders() };
  return h;
}

async function ensureOk(res: Response, label: string): Promise<void> {
  if (res.status === 401) {
    clearAdminToken();
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(ADMIN_UNAUTHORIZED_EVENT));
    throw new UnauthorizedError();
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${label} (${res.status}): ${body}`);
  }
}

export async function getLeads(filters?: LeadFilters): Promise<Lead[]> {
  const params = new URLSearchParams();
  if (filters?.type) params.set('type', filters.type);
  if (filters?.since) params.set('since', filters.since.replace(/h$/, ''));

  const qs = params.toString();
  const url = `${API}/api/leads${qs ? `?${qs}` : ''}`;

  const res = await fetch(url, { headers: { Accept: 'application/json', ...authHeaders() } });
  await ensureOk(res, 'Failed to fetch leads');
  const data = (await res.json()) as { leads?: Lead[] };
  return data.leads ?? [];
}

export async function patchLead(
  id: string,
  body: { status?: Lead['status']; notes?: string }
): Promise<void> {
  const res = await fetch(`${API}/api/leads/${id}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body),
  });
  await ensureOk(res, 'Failed to update lead');
}

export function exportUrl(): string {
  return `${API}/api/leads/export`;
}

/**
 * Fetch the Excel export as a Blob and return an object URL so the browser
 * can trigger a download with the correct filename. A plain <a> href to a
 * cross-origin endpoint is unreliable for binary downloads, especially under
 * static export / CORS.
 */
export async function downloadExport(): Promise<{ url: string; filename: string }> {
  const res = await fetch(exportUrl(), {
    method: 'GET',
    headers: authHeaders(),
  });
  await ensureOk(res, 'Export failed');

  const blob = await res.blob();
  const disposition = res.headers.get('Content-Disposition') ?? '';
  const filenameMatch = /filename="?([^"]+)"?/.exec(disposition);
  const filename = filenameMatch?.[1] ?? `chicking-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;

  return { url: URL.createObjectURL(blob), filename };
}
