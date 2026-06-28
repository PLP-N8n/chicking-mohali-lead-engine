import type { Env } from '../index';
import { json } from '../lib/cors';
import { forwardLead } from '../lib/forward';

const MAX_BODY_BYTES = 16384;
const FIELD_LIMITS = {
  name: 120,
  phone: 20,
  city: 80,
  notes: 4000,
  other: 500,
};

/** Server-authoritative shareable referral code — suffixed from the unique lead id so it can't collide. */
function genReferralCode(name: string | undefined, id: string): string {
  const base = (name || 'FND').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6) || 'FND';
  const suffix = id.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(-5).padEnd(5, '0');
  return `${base}${suffix}`;
}

function toBool(v: unknown): boolean {
  return v === true || v === 1 || v === 'true' || v === 'on' || v === '1';
}

function readString(
  value: unknown,
  field: string,
  max: number
): string | null | Response {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') return json({ error: `${field} must be a string` }, 400);

  const trimmed = value.trim();
  if (trimmed.length > max) {
    return json({ error: `${field} must be ${max} characters or fewer` }, 400);
  }

  return trimmed;
}

export async function handlePost(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  // Enforce the size cap on bytes actually read, not the (spoofable/omittable) Content-Length header.
  const raw = await request.arrayBuffer();
  if (raw.byteLength > MAX_BODY_BYTES) {
    return json({ error: 'Request body too large' }, 413);
  }

  let body: Record<string, unknown>;
  try {
    const parsed = JSON.parse(new TextDecoder().decode(raw)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return json({ error: 'Invalid JSON' }, 400);
    }
    body = parsed as Record<string, unknown>;
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }

  const type = readString(body.type, 'type', FIELD_LIMITS.other);
  const name = readString(body.name, 'name', FIELD_LIMITS.name);
  const phone = readString(body.phone, 'phone', FIELD_LIMITS.phone);
  const city = readString(body.city, 'city', FIELD_LIMITS.city);
  const investment = readString(body.investment, 'investment', FIELD_LIMITS.other);
  const email = readString(body.email, 'email', FIELD_LIMITS.other);
  const property = readString(body.property, 'property', FIELD_LIMITS.other);
  const format = readString(body.format, 'format', FIELD_LIMITS.other);
  const background = readString(body.background, 'background', FIELD_LIMITS.other);
  const experience = readString(body.experience, 'experience', FIELD_LIMITS.other);
  const notes = readString(body.notes, 'notes', FIELD_LIMITS.notes);

  if (type instanceof Response) return type;
  if (name instanceof Response) return name;
  if (phone instanceof Response) return phone;
  if (city instanceof Response) return city;
  if (investment instanceof Response) return investment;
  if (email instanceof Response) return email;
  if (property instanceof Response) return property;
  if (format instanceof Response) return format;
  if (background instanceof Response) return background;
  if (experience instanceof Response) return experience;
  if (notes instanceof Response) return notes;

  if (!type || !name || !phone) return json({ error: 'Missing required fields: type, name, phone' }, 400);
  if (!['b2c', 'b2b'].includes(type)) return json({ error: 'type must be b2c or b2b' }, 400);
  if (!/^\d{10}$/.test(phone.replace(/\s/g, ''))) return json({ error: 'phone must be 10 digits' }, 400);

  // Unpack notes JSON bundle (franchise b2b fields + founders-club b2c fields) for backwards compat
  let parsedNotes: Record<string, unknown> = {};
  if (notes) { try { parsedNotes = JSON.parse(notes); } catch { /* ignore */ } }
  const note = (k: string) => parsedNotes[k];
  const noteString = (field: string, key: string, max = FIELD_LIMITS.other) => readString(note(key), field, max);
  const storedString = (field: string, top: string | null, key: string, max = FIELD_LIMITS.other): string | null | Response => {
    if (top) return top;
    return noteString(field, key, max);
  };

  const resolvedEmail      = storedString('email', email, 'email');
  const resolvedProperty   = storedString('property', property, 'property');
  const resolvedFormat     = storedString('format', format, 'format');
  const resolvedBackground = storedString('background', background, 'background');
  const resolvedExperience = storedString('experience', experience, 'experience');

  // Founders-club / b2c fields — promoted from the notes blob to real columns
  const bodyCampaign = readString(body.campaign, 'campaign', FIELD_LIMITS.other);
  const bodyReferredBy = readString(body.referred_by, 'referred_by', FIELD_LIMITS.other);
  const bodyInstagram = readString(body.instagram, 'instagram', FIELD_LIMITS.other);
  if (resolvedEmail instanceof Response) return resolvedEmail;
  if (resolvedProperty instanceof Response) return resolvedProperty;
  if (resolvedFormat instanceof Response) return resolvedFormat;
  if (resolvedBackground instanceof Response) return resolvedBackground;
  if (resolvedExperience instanceof Response) return resolvedExperience;
  if (bodyCampaign instanceof Response) return bodyCampaign;
  if (bodyReferredBy instanceof Response) return bodyReferredBy;
  if (bodyInstagram instanceof Response) return bodyInstagram;

  const campaign     = storedString('campaign', bodyCampaign, 'campaign');
  const referredBy   = storedString('referred_by', bodyReferredBy, 'referral_code'); // code they arrived with
  const instagram    = storedString('instagram', bodyInstagram, 'instagram');
  if (campaign instanceof Response) return campaign;
  if (referredBy instanceof Response) return referredBy;
  if (instagram instanceof Response) return instagram;

  const whatsappOptin = toBool(body.whatsapp_optin ?? note('whatsapp_optin')) ? 1 : 0;
  const phoneNorm = phone.replace(/\D/g, ''); // 10 digits (already validated) — canonical stored form
  const now = Math.floor(Date.now() / 1000);

  // Idempotency / dedup: same (type, phone) updates the existing lead instead of creating a
  // duplicate row + duplicate downstream scoring/alerts.
  const existing = await env.DB.prepare(
    'SELECT id, referral_code, forward_status FROM leads WHERE type = ? AND phone = ? ORDER BY created_at DESC LIMIT 1'
  ).bind(type, phoneNorm).first<{ id: string; referral_code: string | null; forward_status: string }>();

  let id: string;
  let referralCode: string;
  let isNew: boolean;
  let needForward: boolean;

  if (existing) {
    id = existing.id;
    referralCode = existing.referral_code ?? genReferralCode(name, id);
    isNew = false;
    // refresh mutable contact fields; preserve referral_code / referred_by / campaign / created_at (first-touch)
    await env.DB.prepare(
      `UPDATE leads SET name=?, city=?, investment=?, email=?, property=?, format=?, background=?,
                       experience=?, notes=?, instagram=?, whatsapp_optin=?, updated_at=? WHERE id=?`
    ).bind(
      name, city ?? null, investment ?? null, resolvedEmail, resolvedProperty, resolvedFormat,
      resolvedBackground, resolvedExperience, notes ?? null, instagram, whatsappOptin, now, id
    ).run();
    // re-forward only if it never made it through (n8n was down) — avoids duplicate scoring/alerts
    needForward = existing.forward_status !== 'ok';
  } else {
    id = crypto.randomUUID().replace(/-/g, '').slice(0, 16);
    referralCode = genReferralCode(name, id);
    isNew = true;
    await env.DB.prepare(
      `INSERT INTO leads (id, type, name, phone, city, investment, email, property, format, background, experience,
                          notes, campaign, referral_code, referred_by, instagram, whatsapp_optin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      id, type, name, phoneNorm, city ?? null, investment ?? null,
      resolvedEmail, resolvedProperty, resolvedFormat, resolvedBackground, resolvedExperience,
      notes ?? null, campaign, referralCode, referredBy, instagram, whatsappOptin
    ).run();
    needForward = true;
  }

  // Forward to n8n + record outcome (forward_status). The cron replay re-sends anything stuck.
  if (needForward) {
    ctx.waitUntil(forwardLead(env, {
      id, type, name, phone: phoneNorm, city, investment, email: resolvedEmail,
      property: resolvedProperty, format: resolvedFormat, background: resolvedBackground,
      experience: resolvedExperience, campaign, referral_code: referralCode, referred_by: referredBy,
      instagram, whatsapp_optin: whatsappOptin, created_at: now,
    }));
  }

  return json({ ok: true, id, referral_code: referralCode, duplicate: !isNew }, isNew ? 201 : 200);
}
