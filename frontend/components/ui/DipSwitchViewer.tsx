'use client';

import { useState, useEffect, useMemo, useTransition, useRef } from 'react';
import { getDipSwitches, type DipSwitch } from '@/app/actions/search';

interface DipSwitchViewerProps {
  model: string;
  target?: { switch: number; bit?: number } | null;
  onClose: () => void;
}

export function DipSwitchViewer({ model, target, onClose }: DipSwitchViewerProps) {
  const [switches, setSwitches] = useState<DipSwitch[]>([]);
  const [isPending, startTransition] = useTransition();
  const [filterSw, setFilterSw] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Model aliasing
  const fetchModel = useMemo(() => {
    if (model === 'C6085' || model === 'C6080') return 'C6100';
    if (model === 'C4070' || model === 'C4065') return 'C4080';
    return model;
  }, [model]);

  // Fetch data
  useEffect(() => {
    if (!fetchModel) return;
    startTransition(() => {
      getDipSwitches(fetchModel)
        .then(setSwitches)
        .catch((err) => console.error('Failed to fetch dipswitches', err));
    });
  }, [fetchModel]);

  // Sync filter to target
  useEffect(() => {
    if (target?.switch) {
      setFilterSw(target.switch.toString());
      setSearchQuery('');
    }
  }, [target]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const filteredSwitches = useMemo(() => {
    return switches.filter((s) => {
      if (filterSw && s.switch_number.toString() !== filterSw) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          s.function_name?.toLowerCase().includes(q) ||
          s.setting_0?.toLowerCase().includes(q) ||
          s.setting_1?.toLowerCase().includes(q)
        );
      }
      // Filter out blank/placeholder entries when not searching
      if (s.function_name === '-' || s.function_name === 'Function' || !s.function_name) return false;
      return true;
    });
  }, [switches, filterSw, searchQuery]);

  const groupedSwitches = useMemo(() => {
    const groups: Record<number, DipSwitch[]> = {};
    filteredSwitches.forEach((sw) => {
      if (!groups[sw.switch_number]) groups[sw.switch_number] = [];
      groups[sw.switch_number].push(sw);
    });
    return groups;
  }, [filteredSwitches]);

  if (!model) return null;

  const numSw = parseInt(filterSw) || 0;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-panel animate-scale-in"
        style={{ width: '100%', maxWidth: 860, margin: '0 16px', maxHeight: '90vh' }}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                background: 'var(--accent-dim)',
                border: '1px solid rgba(56,189,248,0.2)',
                borderRadius: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
                <circle cx="7" cy="10" r="1.5" fill="var(--accent)" stroke="none" />
                <circle cx="12" cy="10" r="1.5" fill="var(--text-secondary)" stroke="none" />
                <circle cx="17" cy="10" r="1.5" fill="var(--text-secondary)" stroke="none" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>DipSW Reference</div>
              <div style={{ fontSize: '0.73rem', color: 'var(--text-secondary)' }}>
                Configuration matrix for{' '}
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{model}</span>
                {fetchModel !== model && (
                  <span style={{ opacity: 0.6 }}> (using {fetchModel} data)</span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: '1px solid var(--border-default)',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              borderRadius: 8,
              padding: 6,
              display: 'flex',
              transition: 'background 0.12s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Filters ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 12,
            padding: '12px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          {/* Text search */}
          <div style={{ position: 'relative' }}>
            <svg
              style={{
                position: 'absolute',
                left: 12,
                top: '50%',
                transform: 'translateY(-50%)',
                width: 16,
                height: 16,
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              className="input-base"
              style={{ paddingLeft: 38 }}
              placeholder="Search functions, settings…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Switch number stepper */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              type="button"
              onClick={() => {
                if (numSw > 1) setFilterSw((numSw - 1).toString());
                else setFilterSw('');
              }}
              style={{
                width: 34,
                height: 34,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14" />
              </svg>
            </button>

            <div style={{ position: 'relative' }}>
              <svg
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 14,
                  height: 14,
                  color: 'var(--text-secondary)',
                  pointerEvents: 'none',
                }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
              </svg>
              <input
                type="number"
                className="input-base"
                style={{ paddingLeft: 28, width: 80, textAlign: 'center' }}
                placeholder="SW #"
                value={filterSw}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (e.target.value === '' || v > 0) setFilterSw(e.target.value);
                }}
                min={1}
              />
            </div>

            <button
              type="button"
              onClick={() => setFilterSw((numSw + 1).toString())}
              style={{
                width: 34,
                height: 34,
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M12 5v14M5 12h14" />
              </svg>
            </button>

            {filterSw && (
              <button
                type="button"
                onClick={() => setFilterSw('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '0.7rem',
                  padding: '4px 6px',
                }}
              >
                All
              </button>
            )}
          </div>
        </div>

        {/* ── Content ─────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          {isPending ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
              <div className="spinner" style={{ width: 40, height: 40, borderWidth: 3 }} />
            </div>
          ) : Object.keys(groupedSwitches).length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: 240,
                gap: 12,
                color: 'var(--text-secondary)',
              }}
            >
              <svg
                style={{ width: 48, height: 48, opacity: 0.35 }}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <div style={{ fontSize: '0.95rem' }}>No matching switches found</div>
              <button
                type="button"
                onClick={() => { setFilterSw(''); setSearchQuery(''); }}
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--accent)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
              {Object.keys(groupedSwitches)
                .sort((a, b) => Number(a) - Number(b))
                .map((swNum) => (
                  <div key={swNum}>
                    {/* Group header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 10,
                      }}
                    >
                      <span
                        className="mono"
                        style={{
                          color: 'var(--accent)',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.12em',
                        }}
                      >
                        DipSW {swNum}
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)' }} />
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {groupedSwitches[Number(swNum)].length} bit{groupedSwitches[Number(swNum)].length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Bits */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {groupedSwitches[Number(swNum)].map((sw) => {
                        const isTarget =
                          target &&
                          target.switch === sw.switch_number &&
                          target.bit === sw.bit_number;

                        return (
                          <div
                            key={sw.id}
                            className="dipsw-row"
                            style={{
                              padding: '10px 14px',
                              borderRadius: 10,
                              border: isTarget
                                ? '1px solid rgba(56,189,248,0.5)'
                                : '1px solid var(--border-subtle)',
                              background: isTarget
                                ? 'rgba(56,189,248,0.06)'
                                : 'var(--bg-elevated)',
                              transition: 'all 0.15s',
                              boxShadow: isTarget ? '0 0 16px rgba(56,189,248,0.12)' : 'none',
                            }}
                          >
                            {/* Top row: bit badge + function */}
                            <div className="dipsw-top">
                              <div
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: 2,
                                  flexShrink: 0,
                                }}
                              >
                                <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>BIT</span>
                                <div
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    background: isTarget ? 'var(--accent)' : 'var(--bg-card)',
                                    border: isTarget
                                      ? '2px solid var(--accent)'
                                      : '2px solid var(--border-default)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontWeight: 800,
                                    fontSize: '0.8rem',
                                    color: isTarget ? '#000' : 'var(--text-secondary)',
                                    fontFamily: 'var(--font-mono)',
                                  }}
                                >
                                  {sw.bit_number}
                                </div>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 2 }}>
                                  FUNCTION
                                </div>
                                <div style={{ fontSize: '0.83rem', fontWeight: 500, lineHeight: 1.35 }}>
                                  {sw.function_name}
                                </div>
                              </div>
                            </div>

                            {/* Bottom row: SET 0 + SET 1 */}
                            <div className="dipsw-settings">
                              {/* Setting 0 */}
                              <div
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 8,
                                  background: sw.default_val === '0' ? 'rgba(74,222,128,0.08)' : 'var(--bg-card)',
                                  border: sw.default_val === '0'
                                    ? '1px solid rgba(74,222,128,0.3)'
                                    : '1px solid var(--border-subtle)',
                                  position: 'relative',
                                }}
                              >
                                {sw.default_val === '0' && (
                                  <span
                                    className="chip chip-green"
                                    style={{ position: 'absolute', top: -8, right: 6, fontSize: '0.58rem', padding: '1px 5px' }}
                                  >
                                    DEFAULT
                                  </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--text-muted)' }} />
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SET 0</span>
                                </div>
                                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                  {sw.setting_0 || '—'}
                                </div>
                              </div>

                              {/* Setting 1 */}
                              <div
                                style={{
                                  padding: '8px 10px',
                                  borderRadius: 8,
                                  background: sw.default_val === '1' ? 'rgba(74,222,128,0.08)' : 'var(--bg-card)',
                                  border: sw.default_val === '1'
                                    ? '1px solid rgba(74,222,128,0.3)'
                                    : '1px solid var(--border-subtle)',
                                  position: 'relative',
                                }}
                              >
                                {sw.default_val === '1' && (
                                  <span
                                    className="chip chip-green"
                                    style={{ position: 'absolute', top: -8, right: 6, fontSize: '0.58rem', padding: '1px 5px' }}
                                  >
                                    DEFAULT
                                  </span>
                                )}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)' }} />
                                  <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>SET 1</span>
                                </div>
                                <div className="mono" style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.3 }}>
                                  {sw.setting_1 || '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
