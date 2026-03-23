'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useDebounce } from 'use-debounce';
import type { ManualSparePart } from '@/app/actions/search';

interface SparePartsSearchProps {
  open: boolean;
  onClose: () => void;
  initialQuery?: string;
  model: string;
}

// Models that share the same spare parts catalog
const MODEL_FAMILIES: Record<string, string[]> = {
  C4065: ['C4080', 'C4070'],
  C4070: ['C4080', 'C4065'],
  C4080: ['C4065', 'C4070'],
  C12000: ['C12010'],
  C12010: ['C12000'],
};

// Search Supabase directly from the browser (no server action layer)
async function findParts(modelName: string, query: string): Promise<ManualSparePart[]> {
  const trimmed = query.trim();
  if (!trimmed || !modelName) return [];

  const run = async (term: string): Promise<ManualSparePart[]> => {
    const pat = `%${term}%`;
    const base = supabase
      .from('manual_spare_parts')
      .select('model, section_name, page_number, ref_number, part_code, name, quantity')
      .eq('model', modelName)
      .order('section_name')
      .limit(40);

    const [{ data: byName }, { data: bySection }] = await Promise.all([
      base.ilike('name', pat),
      supabase
        .from('manual_spare_parts')
        .select('model, section_name, page_number, ref_number, part_code, name, quantity')
        .eq('model', modelName)
        .order('section_name')
        .limit(40)
        .ilike('section_name', pat),
    ]);

    const seen = new Set<string>();
    const merged: ManualSparePart[] = [];
    for (const r of [...(byName || []), ...(bySection || [])]) {
      const key = (r as ManualSparePart).part_code + (r as ManualSparePart).model;
      if (!seen.has(key)) { seen.add(key); merged.push(r as ManualSparePart); }
    }
    return merged;
  };

  // 1. Acronym in parentheses e.g. "(PRCB)" → "PRCB"
  const acMatch = trimmed.match(/\(([A-Z0-9]{2,8})\)/);
  if (acMatch) {
    const res = await run(acMatch[1]);
    if (res.length > 0) return res;
  }

  // 2. Full phrase
  const phrase = await run(trimmed);
  if (phrase.length > 0) return phrase;

  // 3. Keyword fallback — longest meaningful word first
  const stopWords = new Set(['unit', 'the', 'and', 'for', 'board', 'assembly', 'assy',
    'with', 'from', 'supply', 'drive', 'section', 'part']);
  const words = trimmed
    .split(/[\s/\-()+0-9]+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()))
    .sort((a, b) => b.length - a.length);

  for (const word of words.slice(0, 4)) {
    const res = await run(word);
    if (res.length > 0) return res;
  }

  // Fallback: try sibling models from the same family
  const siblings = MODEL_FAMILIES[modelName] ?? [];
  for (const sibling of siblings) {
    const siblingRun = async (term: string): Promise<ManualSparePart[]> => {
      const pat = `%${term}%`;
      const base = () =>
        supabase
          .from('manual_spare_parts')
          .select('model, section_name, page_number, ref_number, part_code, name, quantity')
          .eq('model', sibling)
          .order('section_name')
          .limit(40);
      const [{ data: byName }, { data: bySection }] = await Promise.all([
        base().ilike('name', pat),
        base().ilike('section_name', pat),
      ]);
      const seen = new Set<string>();
      const merged: ManualSparePart[] = [];
      for (const r of [...(byName || []), ...(bySection || [])]) {
        const key = (r as ManualSparePart).part_code + (r as ManualSparePart).model;
        if (!seen.has(key)) { seen.add(key); merged.push(r as ManualSparePart); }
      }
      return merged;
    };

    // relabel results to show the originally requested model
    const relabel = (res: ManualSparePart[]) =>
      res.map((r) => ({ ...r, model: modelName }));

    // Try acronym, phrase, keywords on sibling
    if (acMatch) {
      const res = await siblingRun(acMatch[1]);
      if (res.length > 0) return relabel(res);
    }
    const phraseRes2 = await siblingRun(trimmed);
    if (phraseRes2.length > 0) return relabel(phraseRes2);
    for (const word of words.slice(0, 4)) {
      const res = await siblingRun(word);
      if (res.length > 0) return relabel(res);
    }
  }

  return [];
}

export function SparePartsSearch({ open, onClose, initialQuery = '', model }: SparePartsSearchProps) {
  const [query, setQuery] = useState(initialQuery);
  const [debouncedQuery] = useDebounce(query, 350);
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

  // Search on debounced query
  const doSearch = useCallback(async (q: string) => {
    if (!model || !q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const data = await findParts(model, q);
      setResults(data);
    } finally {
      setLoading(false);
    }
  }, [model]);

  useEffect(() => {
    doSearch(debouncedQuery);
  }, [debouncedQuery, doSearch]);

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
                Ricerca Ricambi
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Modello: <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{model}</span>
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
                position: 'absolute', left: 12, top: '50%',
                transform: 'translateY(-50%)', width: 16, height: 16,
                color: 'var(--text-secondary)', pointerEvents: 'none',
              }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>

            <input
              ref={inputRef}
              type="text"
              className="input-base"
              style={{ paddingLeft: 38, paddingRight: 36 }}
              placeholder="Codice parte o descrizione…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoComplete="off"
            />

            {loading && (
              <div
                className="spinner"
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)', width: 16, height: 16,
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
                  <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.88rem' }}>
                    {part.part_code}
                  </span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.68rem' }}>
                    Qty {part.quantity ?? '–'}
                  </span>
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: 6 }}>
                  {part.name}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="chip chip-blue" style={{ fontSize: '0.66rem' }}>{part.model}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>{part.section_name}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>Pag. {part.page_number}</span>
                  <span className="chip chip-neutral" style={{ fontSize: '0.66rem' }}>Rif. {part.ref_number}</span>
                </div>
              </div>
            ))
          ) : (
            !loading && debouncedQuery && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '0.9rem', marginBottom: 4 }}>Nessun ricambio trovato</div>
                <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>Prova con un termine più generico.</div>
              </div>
            )
          )}

          {!loading && !debouncedQuery && (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
              Digita un codice parte o descrizione per cercare
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
