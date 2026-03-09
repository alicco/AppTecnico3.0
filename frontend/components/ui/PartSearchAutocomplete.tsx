'use client';

import { useState, useRef, useCallback } from 'react';
import { smartSearchParts } from '@/app/actions/search';

export interface Part {
  model: string;
  part_code: string;
  name: string;
  section_name: string;
  ref_number: string;
  page_number: string;
  quantity: string;
}

interface PartSearchAutocompleteProps {
  model: string;
  onSelect: (part: Part | null) => void;
  onResults?: (parts: Part[]) => void;
  placeholder?: string;
  onQueryChange?: (query: string) => void;
  initialValue?: string;
}

export function PartSearchAutocomplete({
  model,
  onSelect,
  onResults,
  placeholder = 'Search Part Code or Name…',
  initialValue = '',
}: PartSearchAutocompleteProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [aiInfo, setAiInfo] = useState<{ model: string; keywords: string[] } | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

  // Standard search — direct API call
  const doStandardSearch = useCallback(async (query: string) => {
    if (query.length < 2) {
      onResults?.([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let url = `${API_BASE}/api/parts?q=${encodeURIComponent(query)}&limit=50`;
      if (model) url += `&model=${model}`;
      const res = await fetch(url);
      const data = await res.json();
      const parts = Array.isArray(data) ? data : [];
      onResults?.(parts);
    } catch {
      onResults?.([]);
    } finally {
      setLoading(false);
    }
  }, [API_BASE, model, onResults]);

  // AI-powered search — calls Ollama via server action
  const doAiSearch = useCallback(async (query: string) => {
    if (query.length < 3) {
      onResults?.([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setAiInfo(null);
    setAiMessage(null);
    try {
      const result = await smartSearchParts(query, model || undefined);
      onResults?.(result.parts as Part[]);
      if (result.aiExtracted) {
        setAiInfo(result.aiExtracted);
      }
      if (result.message) {
        setAiMessage(result.message);
      }
    } catch {
      onResults?.([]);
    } finally {
      setLoading(false);
    }
  }, [model, onResults]);

  const doSearch = useCallback((query: string) => {
    if (aiMode) {
      doAiSearch(query);
    } else {
      doStandardSearch(query);
    }
  }, [aiMode, doAiSearch, doStandardSearch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val.trim()) {
      onResults?.([]);
      setAiInfo(null);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    // In AI mode, don't auto-search (it's slow) — wait for Enter or button click
    if (aiMode) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doStandardSearch(val), 300);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (debounceRef.current) clearTimeout(debounceRef.current);
      doSearch(inputValue);
    }
  };

  const handleSearchClick = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    doSearch(inputValue);
  };

  const handleClear = () => {
    setInputValue('');
    setAiInfo(null);
    setAiMessage(null);
    onResults?.([]);
    onSelect(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
        {/* AI mode toggle */}
        <button
          type="button"
          onClick={() => { setAiMode(!aiMode); setAiInfo(null); }}
          title={aiMode ? 'Disattiva ricerca AI' : 'Attiva ricerca AI (Qwen 3.5)'}
          style={{
            height: 44,
            width: 44,
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 12,
            border: aiMode
              ? '1.5px solid var(--accent)'
              : '1px solid var(--border)',
            background: aiMode
              ? 'rgba(56,189,248,0.12)'
              : 'var(--bg-card)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <svg
            width={20}
            height={20}
            viewBox="0 0 24 24"
            fill="none"
            stroke={aiMode ? 'var(--accent)' : 'var(--text-secondary)'}
            strokeWidth={1.8}
          >
            {/* Brain/AI icon */}
            <path d="M12 2a4 4 0 0 1 4 4v1a3 3 0 0 1 2 2.83V11a3 3 0 0 1-1.17 2.38L18 14a3 3 0 0 1-.46 4.92L17 19a4 4 0 0 1-3.73 2.55h-.54A4 4 0 0 1 9 19l-.54-.08A3 3 0 0 1 8 14l1.17-.62A3 3 0 0 1 8 11V9.83A3 3 0 0 1 10 7V6a4 4 0 0 1 2-4Z" />
            <path d="M10 10h.01M14 10h.01M10 14a3.5 3.5 0 0 0 4 0" />
          </svg>
        </button>

        {/* Input wrapper */}
        <div style={{ position: 'relative', flex: 1 }}>
          {/* Search icon */}
          <svg
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 18,
              height: 18,
              color: aiMode ? 'var(--accent)' : 'var(--text-secondary)',
              pointerEvents: 'none',
              transition: 'color 0.2s ease',
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
            type="text"
            className="input-base"
            style={{
              paddingLeft: 44,
              paddingRight: 40,
              fontSize: '1rem',
              borderColor: aiMode ? 'rgba(56,189,248,0.3)' : undefined,
            }}
            placeholder={aiMode ? 'Cerca in italiano… es. "corona della C6100"' : placeholder}
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            spellCheck={false}
          />

          {/* Right side: spinner or clear */}
          <div
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {loading && <div className="spinner" style={{ width: 16, height: 16 }} />}
            {inputValue && !loading && (
              <button
                type="button"
                onClick={handleClear}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 2,
                  color: 'var(--text-secondary)',
                  display: 'flex',
                }}
              >
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Search button */}
        <button
          type="button"
          className="btn btn-primary"
          style={{ height: 44, paddingLeft: 20, paddingRight: 20, flexShrink: 0 }}
          onClick={handleSearchClick}
          disabled={loading}
        >
          {loading ? (
            <div className="spinner" style={{ width: 16, height: 16, borderTopColor: '#000' }} />
          ) : (
            <>
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              Search
            </>
          )}
        </button>
      </div>

      {/* AI mode indicator */}
      {aiMode && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: '0.8rem',
          color: 'var(--accent)',
          paddingLeft: 52,
        }}>
          <span style={{
            display: 'inline-block',
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            animation: loading ? 'pulse 1.5s infinite' : 'none',
          }} />
          {loading
            ? 'Qwen 3.5 sta analizzando la query…'
            : 'Ricerca AI attiva — scrivi in italiano e premi Invio'
          }
        </div>
      )}

      {/* AI extracted info badge */}
      {aiInfo && aiInfo.keywords.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          paddingLeft: 52,
          alignItems: 'center',
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            AI ha cercato:
          </span>
          {aiInfo.model && (
            <span style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(139,92,246,0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139,92,246,0.25)',
            }}>
              {aiInfo.model}
            </span>
          )}
          {aiInfo.keywords.map((kw, i) => (
            <span key={i} style={{
              fontSize: '0.7rem',
              padding: '2px 8px',
              borderRadius: 6,
              background: 'rgba(56,189,248,0.12)',
              color: 'var(--accent)',
              border: '1px solid rgba(56,189,248,0.2)',
            }}>
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* AI message (no results / cross-model) */}
      {aiMessage && (
        <div style={{
          paddingLeft: 52,
          fontSize: '0.8rem',
          color: '#f59e0b',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}>
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          {aiMessage}
        </div>
      )}
    </div>
  );
}
