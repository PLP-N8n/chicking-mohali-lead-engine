import { makeCors, json } from './lib/cors';
import { requireAdmin } from './lib/auth';
import { replayStuckLeads } from './lib/forward';
import { handlePost }   from './routes/leads.post';
import { handleGet }    from './routes/leads.get';
import { handlePatch }  from './routes/leads.patch';
import { handleExport } from './routes/leads.export';
import { handleCount }  from './routes/leads.count';

export interface Env {
  DB: D1Database;
  ADMIN_SECRET: string;
  N8N_WEBHOOK_URL: string;
  N8N_WEBHOOK_SECRET?: string;
  LANDING_ORIGIN: string;
  DASHBOARD_ORIGIN: string;
  CALLMEBOT_PHONE?: string;
  CALLMEBOT_APIKEY?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url    = new URL(request.url);
    const path   = url.pathname;
    const method = request.method;
    const cors   = makeCors(request, env);

    if (method === 'OPTIONS') return cors(new Response(null, { status: 204 }));

    // Routes
    if (path === '/api/leads') {
      if (method === 'POST') return cors(await handlePost(request, env, ctx));
      if (method === 'GET') {
        const auth = requireAdmin(request, env);
        if (auth) return cors(auth);
        return cors(await handleGet(request, env));
      }
    }

    if (path === '/api/leads/export' && method === 'GET') {
      const auth = requireAdmin(request, env);
      if (auth) return cors(auth);
      return cors(await handleExport(request, env));
    }

    // PUBLIC: count is an aggregate scarcity cue (no PII) consumed by the public founders page.
    if (path === '/api/leads/count' && method === 'GET') {
      return cors(await handleCount(request, env));
    }

    const patchMatch = path.match(/^\/api\/leads\/([a-zA-Z0-9]+)$/);
    if (patchMatch && method === 'PATCH') {
      const auth = requireAdmin(request, env);
      if (auth) return cors(auth);
      return cors(await handlePatch(request, env, patchMatch[1]));
    }

    return cors(json({ error: 'Not found' }, 404));
  },

  // Cron replay: re-forward leads saved while n8n was down (forward_status pending/failed).
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(replayStuckLeads(env));
  },
};
