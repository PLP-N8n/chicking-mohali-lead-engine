import type { Env } from '../index';
import { json } from '../lib/cors';

const VALID_STATUSES = ['new', 'contacted', 'qualified', 'dropped'];
const VALID_TIERS = ['HOT', 'WARM', 'COLD', 'NEEDS_REVIEW'];

export async function handlePatch(request: Request, env: Env, id: string): Promise<Response> {
  if (!id) return json({ error: 'Missing lead id' }, 400);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const { status, notes, score, tier, priority_action, audit_status } =
    body as {
      status?: string; notes?: string;
      score?: unknown; tier?: string; priority_action?: string; audit_status?: string;
    };

  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    return json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` }, 400);
  }
  if (tier !== undefined && !VALID_TIERS.includes(tier)) {
    return json({ error: `tier must be one of: ${VALID_TIERS.join(', ')}` }, 400);
  }
  let scoreNum: number | undefined;
  if (score !== undefined) {
    scoreNum = Number(score);
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      return json({ error: 'score must be a number 0-100' }, 400);
    }
  }

  const fields: string[] = [];
  const params: unknown[] = [];

  if (status !== undefined) { fields.push('status = ?'); params.push(status); }
  if (notes  !== undefined) { fields.push('notes = ?');  params.push(notes); }
  // W2 scoring writeback (so the digest + dashboard read deterministic tier data, not guesses)
  if (scoreNum !== undefined)        { fields.push('score = ?');           params.push(scoreNum); }
  if (tier !== undefined)            { fields.push('tier = ?');            params.push(tier); }
  if (priority_action !== undefined) { fields.push('priority_action = ?'); params.push(priority_action); }
  if (audit_status !== undefined)    { fields.push('audit_status = ?');    params.push(audit_status); }
  if (scoreNum !== undefined || tier !== undefined) {
    fields.push('scored_at = ?'); params.push(Math.floor(Date.now() / 1000));
  }

  if (!fields.length) return json({ error: 'Nothing to update' }, 400);

  fields.push('updated_at = ?');
  params.push(Math.floor(Date.now() / 1000));
  params.push(id);

  const result = await env.DB.prepare(
    `UPDATE leads SET ${fields.join(', ')} WHERE id = ?`
  ).bind(...params).run();

  if (result.meta.changes === 0) return json({ error: 'Lead not found' }, 404);
  return json({ ok: true });
}
