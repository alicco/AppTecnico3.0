'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Sensor } from '@/app/actions/search';

// Model alias map (same as server side)
const ALIAS_MAP: Record<string, string> = {
  C7090: 'C7100', C14000: 'C12000',
  C4065: 'C4080', C4070: 'C4080',
};

async function fetchSensor(model: string, partId: string): Promise<Sensor | null> {
  const lookupModel = ALIAS_MAP[model] ?? model;
  const { data, error } = await supabase
    .from('sensors')
    .select('id, model, part_id, part_code, description, section, key, page')
    .eq('model', lookupModel)
    .eq('part_id', partId.toUpperCase())
    .maybeSingle();
  if (error || !data) return null;
  return data as Sensor;
}

// ── Regex: matches PS1, PS12, PS-12, ps1 (case-insensitive, word boundary)
const PS_REGEX = /\b(PS-?\d{1,3})\b/gi;

interface SensorDetailProps {
  sensor: Sensor;
  onClose: () => void;
}

function SensorDetail({ sensor, onClose }: SensorDetailProps) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-panel" style={{ width: '100%', maxWidth: 480, margin: '0 16px' }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
              Sensor Reference
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="mono" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--accent)' }}>
                {sensor.part_id}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 6, padding: '2px 8px' }}>
                {sensor.model}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: '1px solid var(--border-default)', cursor: 'pointer', color: 'var(--text-secondary)', borderRadius: 8, padding: 6, display: 'flex', transition: 'background 0.12s' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {sensor.description && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Description</div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{sensor.description}</div>
            </div>
          )}

          {sensor.part_code && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Part Code</div>
              <div className="mono" style={{ fontSize: '0.9rem', color: 'var(--accent)', fontWeight: 700 }}>{sensor.part_code}</div>
            </div>
          )}

          {sensor.section && (
            <div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Section</div>
              <div style={{ fontSize: '0.88rem' }}>{sensor.section}</div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 12 }}>
            {sensor.page != null && (
              <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Manual Page</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>{sensor.page}</div>
              </div>
            )}
            {sensor.key != null && (
              <div style={{ flex: 1, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Key Ref.</div>
                <div className="mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent)' }}>{sensor.key}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Single clickable PS chip (exported for use in renderLinkedText) ─────────

export interface PsChipProps {
  label: string;   // e.g. "PS1"
  model: string;
}

export function PsChip({ label, model }: PsChipProps) {
  const [sensor, setSensor] = useState<Sensor | null | 'loading' | 'not_found'>('loading');
  const [open, setOpen] = useState(false);

  const handleClick = async () => {
    if (sensor === 'loading') {
      const normalized = label.replace('-', '').toUpperCase(); // PS-1 → PS1
      const result = await fetchSensor(model, normalized);
      setSensor(result ?? 'not_found');
      if (result) setOpen(true);
    } else if (sensor && sensor !== 'not_found') {
      setOpen(true);
    }
  };

  const found = sensor !== 'loading' && sensor !== 'not_found' && sensor !== null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title={found ? `${(sensor as Sensor).description} — pag. ${(sensor as Sensor).page}` : undefined}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '2px 9px',
          borderRadius: 999,
          fontSize: '0.78rem',
          fontWeight: 700,
          fontFamily: 'var(--font-mono, monospace)',
          background: sensor === 'not_found'
            ? 'rgba(100,100,100,0.1)'
            : 'rgba(56,189,248,0.12)',
          border: sensor === 'not_found'
            ? '1px solid rgba(100,100,100,0.2)'
            : '1px solid rgba(56,189,248,0.35)',
          color: sensor === 'not_found' ? 'var(--text-muted)' : 'var(--accent)',
          cursor: sensor === 'not_found' ? 'default' : 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          lineHeight: 1.5,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          if (sensor !== 'not_found') {
            e.currentTarget.style.background = 'rgba(56,189,248,0.22)';
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.6)';
          }
        }}
        onMouseLeave={(e) => {
          if (sensor !== 'not_found') {
            e.currentTarget.style.background = 'rgba(56,189,248,0.12)';
            e.currentTarget.style.borderColor = 'rgba(56,189,248,0.35)';
          }
        }}
      >
        {label.toUpperCase()}
      </button>
      {open && found && (
        <SensorDetail sensor={sensor as Sensor} onClose={() => setOpen(false)} />
      )}
    </>
  );
}

// ── Main export: renders text with PS references replaced by chips ───────────

interface SensorTextProps {
  text: string;
  model: string;
  style?: React.CSSProperties;
}

export function SensorText({ text, model, style }: SensorTextProps) {
  if (!text) return null;

  // Split on PS references, keeping the matches
  const parts = text.split(PS_REGEX);

  return (
    <span style={{ lineHeight: 1.6, ...style }}>
      {parts.map((part, i) => {
        if (PS_REGEX.test(part)) {
          PS_REGEX.lastIndex = 0; // reset stateful regex
          return <PsChip key={i} label={part} model={model} />;
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
