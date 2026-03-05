'use client';

import { useState, useEffect, useRef } from 'react';
import { searchSpareParts, type ManualSparePart } from '@/app/actions/search';
import { useDebounce } from 'use-debounce';

interface SparePartsSearchProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  model: string;
}

export function SparePartsSearch({ open, onClose, initialQuery = '', model }: SparePartsSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, 450);
  const [results, setResults] = useState<ManualSparePart[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync query when dialog opens with a new initialQuery
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open, initialQuery]);

  // Clear results when closed
  useEffect(() => {
    if (!open) setResults([]);
  }, [open]);

  // Fetch on debounced query
  useEffect(() => {
    if (!model || !debouncedQuery) {
      setResults([]);
      return;
    }
    setLoading(true);
    searchSpareParts(model, debouncedQuery, true)
      .then(setResults)
      .finally(() => setLoading(false));
  }, [debouncedQuery, model]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="modal-panel"
        style={{ width: '100%', maxWidth: 640, margin: '0 16px' }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 32,
                height: 32,
                background: 'var(--accent-dim)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2}>
                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
              </svg>
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                Spare Parts Search
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Model: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{model}</span>
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
              alignItems: 'center',
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

        {/* Search input */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0 }}>
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
              ref={inputRef}
              type="text"
              className="input-base"
              style={{ paddingLeft: 38, paddingRight: 36 }}
              placeholder="Enter part code or description…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />

            {loading && (
              <div
                className="spinner"
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 16,
                  height: 16,
                }}
              />
            )}
          </div>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {results.length > 0 ? (
            results.map((part, idx) => (
              <div
                key={`${part.part_code}-${idx}`}
                style={{
                  padding: '12px 20px',
                  borderBottom: idx < results.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    className="mono"
                    style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.88rem' }}
                  >
                    {part.part_code}
                  </span>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {part.similarity != null && (
                      <span className="chip chip-green" style={{ fontSize: '0.68rem' }}>
                        {Math.round(part.similarity * 100)}% match
                      </span>
                    )}
                    <span className="chip chip-neutral" style={{ fontSize: '0.68rem' }}>
                      Qty {part.quantity ?? '–'}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 4 }}>
                  {part.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip chip-blue" style={{ fontSize: '0.66rem' }}>{part.model}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>{part.section_name}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>Pg {part.page_number}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>Ref {part.ref_number}</span>
                </div>
              </div>
            ))
          ) : (
            !loading && debouncedQuery && (
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg
                  style={{ width: 40, height: 40, margin: '0 auto 12px', opacity: 0.4, display: 'block' }}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>No parts found</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
                  Try a broader term or check the part code.
                </div>
              </div>
            )
          )}

          {!loading && !debouncedQuery && (
            <div
              style={{
                padding: '40px 20px',
                textAlign: 'center',
                color: 'var(--text-secondary)',
                fontSize: '0.85rem',
              }}
            >
              Type a part code or description to search
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
