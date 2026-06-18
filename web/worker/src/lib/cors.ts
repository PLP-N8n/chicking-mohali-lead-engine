import type { Env } from '../index';
const ALLOWED = [
  'https://chicking-mohali.pages.dev',
  'https://chicking-dashboard.pages.dev',
];

export function makeCors(request: Request, env: Env) {
  const origin = request.headers.get('Origin') ?? '';
  const allowed =
    ALLOWED.includes(origin) ||
    (!!env.LANDING_ORIGIN && origin === env.LANDING_ORIGIN) ||
    (!!env.DASHBOARD_ORIGIN && origin === env.DASHBOARD_ORIGIN) ||
    origin.startsWith('http://localhost') ||
    origin.startsWith('http://127.0.0.1');

  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
  if (allowed) headers['Access-Control-Allow-Origin'] = origin;

  return (res: Response): Response => {
    const next = new Response(res.body, res);
    for (const [k, v] of Object.entries(headers)) next.headers.set(k, v);
    return next;
  };
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
