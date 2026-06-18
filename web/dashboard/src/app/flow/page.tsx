'use client';

const RED   = '#C8102E';
const DARK  = '#0f0f0f';
const GRAY  = '#6b7280';
const LIGHT = '#f3f4f6';

type NodeColor = 'red' | 'blue' | 'purple' | 'green' | 'amber' | 'teal';

const PALETTE: Record<NodeColor, { bg: string; border: string; label: string }> = {
  red:    { bg: '#fff1f2', border: '#C8102E', label: '#9f0a1f' },
  blue:   { bg: '#eff6ff', border: '#3b82f6', label: '#1d4ed8' },
  purple: { bg: '#f5f3ff', border: '#8b5cf6', label: '#6d28d9' },
  green:  { bg: '#f0fdf4', border: '#22c55e', label: '#15803d' },
  amber:  { bg: '#fffbeb', border: '#f59e0b', label: '#b45309' },
  teal:   { bg: '#f0fdfa', border: '#14b8a6', label: '#0f766e' },
};

function Node({ color, icon, title, lines, badge }: {
  color: NodeColor; icon: string; title: string; lines: string[]; badge?: string;
}) {
  const p = PALETTE[color];
  return (
    <div style={{
      background: p.bg, border: `2px solid ${p.border}`, borderRadius: 14,
      padding: '1rem 1.1rem', minWidth: 190, maxWidth: 220, position: 'relative',
      boxShadow: '0 2px 8px rgba(0,0,0,.06)',
    }}>
      {badge && (
        <span style={{
          position: 'absolute', top: -10, right: 10,
          background: p.border, color: '#fff', fontSize: '.65rem',
          fontWeight: 700, padding: '2px 8px', borderRadius: 20, letterSpacing: '.04em',
        }}>{badge}</span>
      )}
      <div style={{ fontSize: '1.4rem', marginBottom: '.3rem' }}>{icon}</div>
      <div style={{ fontWeight: 700, fontSize: '.85rem', color: p.label, marginBottom: '.4rem' }}>{title}</div>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: '.72rem', color: GRAY, lineHeight: 1.5 }}>• {l}</div>
      ))}
    </div>
  );
}

function Arrow({ label, vertical }: { label?: string; vertical?: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: vertical ? 'column' : 'row',
      alignItems: 'center', gap: 2,
      ...(vertical ? { margin: '4px 0' } : { margin: '0 4px' }),
    }}>
      {label && (
        <span style={{ fontSize: '.62rem', color: GRAY, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}</span>
      )}
      <div style={{ color: '#d1d5db', fontSize: vertical ? '1.1rem' : '1rem' }}>
        {vertical ? '↓' : '→'}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '.68rem', fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '.08em', color: GRAY, marginBottom: '.5rem',
    }}>{children}</div>
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '.5rem 0' }}>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
      <span style={{ fontSize: '.68rem', fontWeight: 700, color: GRAY, textTransform: 'uppercase', letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#e5e7eb' }} />
    </div>
  );
}

function LiveDot({ color }: { color: string }) {
  return (
    <span style={{
      display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
      background: color, marginRight: 5, verticalAlign: 'middle',
      boxShadow: `0 0 0 2px ${color}33`,
    }} />
  );
}

function Legend() {
  const items: [NodeColor, string][] = [
    ['red',    'Entry / Forms'],
    ['blue',   'Infrastructure'],
    ['purple', 'AI / Automation'],
    ['green',  'CRM / Data'],
    ['amber',  'Notifications'],
    ['teal',   'Delivery'],
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.75rem', marginBottom: '1.5rem' }}>
      {items.map(([c, label]) => (
        <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '.35rem', fontSize: '.72rem', color: GRAY }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[c].border }} />
          {label}
        </div>
      ))}
    </div>
  );
}

export default function FlowPage() {
  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: '1.5rem 1rem', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: DARK, margin: 0 }}>
            <span style={{ color: RED }}>Chicking Mohali</span> — Pipeline Architecture
          </h1>
          <p style={{ fontSize: '.78rem', color: GRAY, margin: '.25rem 0 0' }}>
            End-to-end flow from lead form submission to Ajay&apos;s daily digest
          </p>
        </div>
        <div style={{ display: 'flex', gap: '.5rem' }}>
          <a href="/leads" style={{ display: 'inline-flex', alignItems: 'center', gap: '.35rem', padding: '.5rem .9rem', border: '1.5px solid #e5e7eb', borderRadius: 8, background: '#fff', fontSize: '.85rem', fontWeight: 600, color: DARK, textDecoration: 'none' }}>
            ← Leads Table
          </a>
        </div>
      </div>

      {/* Status strip */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '.75rem 1.1rem', marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
        {[
          ['Cloudflare Worker', '#22c55e'],
          ['D1 Database',       '#22c55e'],
          ['n8n W1 Lead Intake','#22c55e'],
          ['n8n W2 AI Scoring', '#22c55e'],
          ['n8n W3 Daily Digest','#22c55e'],
          ['Gayatri API',       '#22c55e'],
          ['HubSpot CRM',       '#22c55e'],
          ['Resend Email',      '#f59e0b'],
        ].map(([name, color]) => (
          <div key={name} style={{ fontSize: '.75rem', color: GRAY, display: 'flex', alignItems: 'center' }}>
            <LiveDot color={color} />{name}
          </div>
        ))}
        <div style={{ fontSize: '.68rem', color: '#d1d5db', marginLeft: 'auto', alignSelf: 'center' }}>
          🟡 Resend pending domain verification
        </div>
      </div>

      <Legend />

      {/* ── LAYER 1: ENTRY ── */}
      <SectionLabel>Layer 1 — Lead Entry</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Node color="red" icon="👤" title="B2C Waitlist Form" badge="waitlist"
          lines={['Name + Phone + City', 'Consent (required)', 'Marketing opt-in (optional)']} />
        <Node color="red" icon="🏢" title="B2B Franchise Form" badge="franchise"
          lines={['9 data points collected', 'Name · Phone · Email · City', 'Investment · Property · Format', 'Background · Experience']} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: '.72rem', color: GRAY, fontWeight: 600, marginBottom: '.25rem' }}>Both forms POST to</div>
          <Arrow />
        </div>
        <Node color="blue" icon="⚡" title="Cloudflare Worker" badge="edge"
          lines={['Validates all fields', 'Deduplicates phone format', 'Returns instant success to user', 'ID assigned on every lead']} />
      </div>

      {/* ── LAYER 2: STORAGE ── */}
      <Divider label="Persist first, then forward" />
      <SectionLabel>Layer 2 — Storage</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Arrow label="writes to" />
        <Node color="blue" icon="🗄️" title="Cloudflare D1" badge="source of truth"
          lines={['All 9 b2b fields stored', 'All 4 b2c fields stored', 'Queryable via /api/leads', 'Powers dashboard table']} />
        <Arrow label="fire & forget" />
        <Node color="purple" icon="🔄" title="n8n W1 — Lead Intake" badge="relay"
          lines={['Receives full payload', 'Forwards to Gayatri API', 'Responds 200 OK to Worker', '45s timeout with retry']} />
      </div>

      {/* ── LAYER 3: INTELLIGENCE ── */}
      <Divider label="AI processing" />
      <SectionLabel>Layer 3 — Gayatri AI + CRM</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Arrow label="POSTs to" />
        <Node color="purple" icon="🧠" title="Gayatri API" badge="AI core"
          lines={['Validates + normalises data', 'Location scoring (city tier)', 'Ollama: drafts WhatsApp msg', 'Handles HubSpot dedup (409)']} />
        <Arrow />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <Node color="green" icon="📋" title="HubSpot CRM"
            lines={['Contact create or update', '9 custom properties synced', 'enquiry_type · city · score', 'property · format · experience']} />
          <Node color="amber" icon="📱" title="Telegram Alert"
            lines={['Instant ping to Hunny', 'Name · Phone · City · Score', 'HOT leads flagged 🔥']} />
          <Node color="teal" icon="📧" title="Confirmation Email"
            lines={['B2B only (requires email)', 'Sent via Resend', 'Branded HTML template', 'Reply-to: franchise@rudradigital.uk']} />
        </div>
      </div>

      {/* ── LAYER 4: SCORING ── */}
      <Divider label="Parallel AI scoring (every lead)" />
      <SectionLabel>Layer 4 — n8n W2: AI Lead Scoring</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Node color="purple" icon="🤖" title="Ollama Generator" badge="minimax-m3"
          lines={['Brand guidelines baked in', 'Scores 0–100 per lead', 'HOT · WARM · COLD tier', 'Priority action for Ajay']} />
        <Arrow label="validated by" />
        <Node color="purple" icon="🔍" title="LLM Auditor"
          lines={['Independent second model call', 'Checks: facts · tone · claims', 'Auto-fail: wrong figures', 'FAIL → flagged to Hunny']} />
        <Arrow label="PASS →" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <Node color="green" icon="🏷️" title="HubSpot Tagged"
            lines={['hs_lead_status updated', 'chicking_lead_score set', 'chicking_priority_action set']} />
          <Node color="amber" icon="🔥" title="HOT Alert"
            lines={['Score ≥ 80 = immediate Telegram', 'Name · City · Score · Why', 'Direct action prompt']} />
        </div>
      </div>

      {/* ── LAYER 5: DAILY DIGEST ── */}
      <Divider label="Daily intelligence loop" />
      <SectionLabel>Layer 5 — n8n W3: Daily Ajay Digest (10am IST)</SectionLabel>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <Node color="blue" icon="⏰" title="Cron Trigger" badge="04:30 UTC"
          lines={['Fires every day at 10am IST', 'Fetches B2B + B2C from D1', 'Last 30 days of leads']} />
        <Arrow />
        <Node color="purple" icon="🤖" title="Ollama Generator"
          lines={['Full brand guidelines prompt', 'Pipeline: HOT/WARM/COLD counts', 'City breakdown + forecast', 'Overdue WARM leads flagged', 'Priority actions for Ajay']} />
        <Arrow label="audited by" />
        <Node color="purple" icon="🔍" title="LLM Auditor"
          lines={['Validates all facts in report', 'Checks no false promises', 'FAIL → alert to Hunny only']} />
        <Arrow label="PASS →" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.75rem' }}>
          <Node color="teal" icon="📨" title="Email to Ajay"
            lines={['To: ajkum4r@gmail.com', 'Branded HTML report', 'Revenue forecast included', 'Reply-to: franchise@rudradigital.uk']} />
          <Node color="amber" icon="✅" title="Telegram Confirm"
            lines={['Confirms digest was sent', 'Or flags if audit failed']} />
        </div>
      </div>

      {/* ── SCORING GUIDE ── */}
      <Divider label="Lead scoring reference" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { tier: 'HOT', score: '80–100', color: '#C8102E', bg: '#fff1f2', criteria: ['Location identified', 'Capital confirmed (₹75L)', 'Business background', 'Active communication'] },
          { tier: 'WARM', score: '40–79', color: '#f59e0b', bg: '#fffbeb', criteria: ['Location being scouted', 'Interest confirmed', 'Responsive to follow-ups', 'Investment range given'] },
          { tier: 'COLD', score: '0–39', color: '#6b7280', bg: '#f9fafb', criteria: ['Enquiry only', 'No financial detail', 'City outside priority zones', 'Unresponsive after 2+ touches'] },
        ].map(({ tier, score, color, bg, criteria }) => (
          <div key={tier} style={{ background: bg, border: `2px solid ${color}`, borderRadius: 12, padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '.9rem', color }}>{tier}</span>
              <span style={{ fontSize: '.72rem', color, fontWeight: 600, background: `${color}18`, padding: '2px 8px', borderRadius: 20 }}>{score}</span>
            </div>
            {criteria.map((c, i) => <div key={i} style={{ fontSize: '.72rem', color: GRAY, lineHeight: 1.7 }}>• {c}</div>)}
          </div>
        ))}
      </div>

      {/* ── B2C PERSONAS ── */}
      <Divider label="B2C customer personas" />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { name: 'Arjun', tag: 'Student', icon: '🎓', price: '₹150–280', freq: '10×/mo', note: 'Late-night, value-first' },
          { name: 'Priya', tag: 'Professional', icon: '💼', price: '₹280–420', freq: '7×/mo', note: 'Grilled, health-aware' },
          { name: 'Rohit', tag: 'Family Man', icon: '👨‍👩‍👧', price: '₹800–1000', freq: '5×/mo', note: 'Weekend family treat' },
          { name: 'Nisha', tag: 'Explorer', icon: '📱', price: '₹250–380', freq: '5×/mo', note: 'Insta-driven, social' },
        ].map(({ name, tag, icon, price, freq, note }) => (
          <div key={name} style={{ background: '#fff', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '.9rem', boxShadow: '0 1px 4px rgba(0,0,0,.04)' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '.25rem' }}>{icon}</div>
            <div style={{ fontWeight: 700, fontSize: '.85rem', color: DARK }}>{name}</div>
            <div style={{ fontSize: '.68rem', color: RED, fontWeight: 600, marginBottom: '.4rem' }}>{tag}</div>
            <div style={{ fontSize: '.72rem', color: GRAY, lineHeight: 1.6 }}>
              <div>Avg spend: {price}</div>
              <div>Frequency: {freq}</div>
              <div>Trigger: {note}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1rem', textAlign: 'center', fontSize: '.72rem', color: '#d1d5db' }}>
        Powered by Gayatri AI · Cloudflare · n8n · HubSpot · Ollama (minimax-m3) · Resend · Zero cloud AI spend
      </div>

    </div>
  );
}
