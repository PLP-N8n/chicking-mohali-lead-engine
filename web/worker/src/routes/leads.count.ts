import type { Env } from '../index';
import { json } from '../lib/cors';

/**
 * GET /api/leads/count?campaign=founders-club&type=b2c
 * Returns the real lead count for an honest "N of 1,000 claimed" scarcity cue.
 */
export async function handleCount(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const campaign = url.searchParams.get('campaign');
  const type = url.searchParams.get('type');

  // COUNT(DISTINCT phone) so a person submitting twice can't inflate the founders scarcity cue.
  let sql = 'SELECT COUNT(DISTINCT phone) AS count FROM leads WHERE 1=1';
  const binds: string[] = [];
  if (campaign) { sql += ' AND campaign = ?'; binds.push(campaign); }
  if (type) { sql += ' AND type = ?'; binds.push(type); }

  const row = await env.DB.prepare(sql).bind(...binds).first<{ count: number }>();
  return json({ count: row?.count ?? 0 });
}
