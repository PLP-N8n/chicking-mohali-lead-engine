import { json } from './cors';
import type { Env } from '../index';

function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const len = Math.max(a.length, b.length);

  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }

  return diff === 0;
}

export function requireAdmin(request: Request, env: Env): Response | null {
  const expected = env.ADMIN_SECRET;
  const header = request.headers.get('Authorization') ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!expected || !token || !constantTimeEqual(token, expected)) {
    return json({ error: 'Unauthorized' }, 401);
  }

  return null;
}
