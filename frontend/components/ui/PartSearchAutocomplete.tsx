'use client';

import { useState, useRef, useCallback } from 'react';
import { searchPartsDirectly } from '@/app/actions/search';

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
  onSelect: (part: Part | null) => void;
  onResults?: (parts: Part[]) => void;
  placeholder?: string;
}

export function PartSearchAutocomplete({
  onSelect,
  onResults,
  placeholder = 'Cerca codice parte o descrizione…',
}: PartSearchAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      onResults?.([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const parts = await searchPartsDirectly(query);
      onResults?.(parts as Part[]);
    } catch {
      onResults?.([]);
    } finally {
      setLoading(false);
    }
  }, [onResults]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (!val.trim()) {
      onResults?.([]);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(val), 300);
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
    onResults?.([]);
    onSelect(null);
  };

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%' }}>
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
          type="text"
          className="input-base"
          style={{
            paddingLeft: 44,
            paddingRight: 40,
            fontSize: '1rem',
          }}
          placeholder={placeholder}
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
            Cerca
          </>
        )}
      </button>
    </div>
  );
}
