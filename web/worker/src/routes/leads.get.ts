import type { Env } from '../index';
import { json } from '../lib/cors';

export async function handleGet(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const type  = url.searchParams.get('type');
  const since = url.searchParams.get('since'); // e.g. '1h'

  let query = 'SELECT * FROM leads WHERE 1=1';
  const params: unknown[] = [];

  if (type && ['b2c', 'b2b'].includes(type)) {
    query += ' AND type = ?';
    params.push(type);
  }
  if (since) {
    const hours = parseInt(since, 10);
    if (!isNaN(hours) && hours > 0) {
      query += ' AND created_at >= ?';
      params.push(Math.floor(Date.now() / 1000) - hours * 3600);
    }
  }

  query += ' ORDER BY created_at DESC LIMIT 500';

  const stmt = params.length
    ? env.DB.prepare(query).bind(...params)
    : env.DB.prepare(query);

  const { results } = await stmt.all();
  return json({ leads: results });
}
