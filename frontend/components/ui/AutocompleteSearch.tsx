'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { searchErrors, type ErrorCode } from '@/app/actions/search';

interface AutocompleteSearchProps {
  model: string;
  onSelect: (code: string) => void;
  placeholder?: string;
  onQueryChange?: (query: string) => void;
  initialValue?: string;
}

export function AutocompleteSearch({
  model,
  onSelect,
  onQueryChange,
  placeholder = 'Search Error Code…',
  initialValue = '',
}: AutocompleteSearchProps) {
  const [inputValue, setInputValue] = useState(initialValue);
  const [options, setOptions] = useState<ErrorCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchOptions = useCallback((query: string) => {
    if (!model || query.length < 1) {
      setOptions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchErrors(model, query)
      .then((res) => {
        if (Array.isArray(res)) setOptions(res);
        else setOptions([]);
      })
      .catch(() => setOptions([]))
      .finally(() => setLoading(false));
  }, [model]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setHighlighted(-1);
    onQueryChange?.(val);

    if (!val.trim()) {
      setOptions([]);
      setOpen(false);
      setLoading(false);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchOptions(val), 280);
    // Calcola posizione per dropdown fixed — usa l'input stesso come riferimento
    if (inputRef.current) {
      const r = inputRef.current.getBoundingClientRect();
      setDropdownRect({ top: r.bottom + 4, left: r.left, width: r.width });
    }
    setOpen(true);
  };

  const handleSelect = (code: string) => {
    setInputValue(code);
    setOpen(false);
    setOptions([]);
    onQueryChange?.(code);
    onSelect(code);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && options[highlighted]) {
        handleSelect(options[highlighted].code);
      } else {
        // free‑solo submit
        onSelect(inputValue);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleClear = () => {
    setInputValue('');
    setOptions([]);
    setOpen(false);
    onQueryChange?.('');
    onSelect('');
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {/* Search icon */}
        <svg
          style={{
            position: 'absolute',
            left: 14,
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
          ref={inputRef}
          type="text"
          className="input-base"
          style={{ paddingLeft: 44, paddingRight: 44, fontSize: '1.05rem' }}
          placeholder={placeholder}
          value={inputValue}
          disabled={!model}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (options.length > 0) setOpen(true);
          }}
          autoComplete="off"
          spellCheck={false}
        />

        {/* Right side: spinner or clear */}
        <div style={{ position: 'absolute', right: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
          {loading && (
            <div
              className="spinner"
              style={{ width: 16, height: 16, flexShrink: 0 }}
            />
          )}
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
                alignItems: 'center',
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Dropdown — portaled nel body per evitare containing block da transform */}
      {open && options.length > 0 && dropdownRect && typeof document !== 'undefined' && createPortal(
        <div
          className="animate-fade-in"
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            background: 'var(--bg-card)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 9999,
            maxHeight: 320,
            overflowY: 'auto',
          }}
        >
          {options.map((opt, idx) => (
            <button
              key={opt.id ?? opt.code}
              type="button"
              onMouseDown={() => handleSelect(opt.code)}
              onMouseEnter={() => setHighlighted(idx)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '10px 14px',
                background: idx === highlighted ? 'var(--bg-hover)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                gap: 12,
                transition: 'background 0.1s',
              }}
            >
              <span
                className="mono"
                style={{
                  color: 'var(--accent)',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  flexShrink: 0,
                }}
              >
                {opt.code}
              </span>
              {opt.cause && (
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    maxWidth: '60%',
                  }}
                >
                  {opt.cause}
                </span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}
