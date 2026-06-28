import type { Env } from '../index';

/** The lead fields the n8n webhook payload is built from (subset of the D1 row). */
export interface ForwardableLead {
  id: string;
  type: string;
  name: string;
  phone: string;
  city: string | null;
  investment: string | null;
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
  created_at?: number;
}

/**
 * Forward a lead to the n8n intake webhook and record the outcome in D1
 * (forward_status = ok | failed). Used by both POST /api/leads and the cron replay,
 * so a lead saved while n8n is down is never silently lost — the replay re-sends it.
 * Returns true on success. Fails closed: never sends without the webhook secret.
 */
export async function forwardLead(env: Env, lead: ForwardableLead): Promise<boolean> {
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) return false;

  const setStatus = (status: string, error: string | null) =>
    env.DB.prepare(
      'UPDATE leads SET forward_status = ?, forwarded_at = ?, forward_error = ? WHERE id = ?'
    ).bind(status, status === 'ok' ? Math.floor(Date.now() / 1000) : null, error, lead.id).run();

  try {
    const res = await fetch(env.N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-webhook-secret': env.N8N_WEBHOOK_SECRET },
      body: JSON.stringify({
        id: lead.id, type: lead.type, name: lead.name, phone: lead.phone,
        city: lead.city, investment: lead.investment, email: lead.email,
        property: lead.property, format: lead.format, background: lead.background,
        experience: lead.experience, campaign: lead.campaign,
        referral_code: lead.referral_code, referred_by: lead.referred_by,
        instagram: lead.instagram, whatsapp_optin: !!lead.whatsapp_optin,
        created_at: lead.created_at ?? Math.floor(Date.now() / 1000),
      }),
    });
    if (res.ok) { await setStatus('ok', null); return true; }
    await setStatus('failed', `HTTP ${res.status}`);
    return false;
  } catch (e) {
    await setStatus('failed', String(e).slice(0, 300));
    return false;
  }
}

/** Re-forward leads stuck in pending/failed (n8n was down at submit time). Called from cron. */
export async function replayStuckLeads(env: Env, olderThanSeconds = 600, limit = 50): Promise<number> {
  const cutoff = Math.floor(Date.now() / 1000) - olderThanSeconds;
  const { results } = await env.DB.prepare(
    `SELECT * FROM leads WHERE forward_status IN ('pending','failed') AND created_at < ?
     ORDER BY created_at ASC LIMIT ?`
  ).bind(cutoff, limit).all<ForwardableLead>();

  let ok = 0;
  for (const lead of results as ForwardableLead[]) {
    if (await forwardLead(env, lead)) ok++;
  }
  if (results.length) console.log(`replay: re-forwarded ${ok}/${results.length} stuck leads`);
  return ok;
}
