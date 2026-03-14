'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getPrinters, searchErrors, type ErrorCode } from '@/app/actions/search';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AutocompleteSearch } from '@/components/ui/AutocompleteSearch';
import { DipSwitchViewer } from '@/components/ui/DipSwitchViewer';
import { PartSearchAutocomplete, Part } from '@/components/ui/PartSearchAutocomplete';
import { toast } from 'react-hot-toast';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CartItem extends Part {
  cartId: string;
}

interface MaintenanceSection {
  name: string;
  items: {
    code: string;
    name: string;
    qty: string;
    life: string;
    page_key: string;
  }[];
}

// ─── Inline SVG icons ──────────────────────────────────────────────────────────

const IcoBug = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M9 9a3 3 0 1 1 6 0v7a3 3 0 1 1-6 0V9z" />
    <path d="M6.24 4.76a4.97 4.97 0 0 1 1.06-1.46M17.76 4.76a4.97 4.97 0 0 0-1.06-1.46M3 10h3M18 10h3M3 16h2M19 16h2M8 22l1-3M16 22l-1-3" />
  </svg>
);

const IcoWrench = ({ size = 48 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IcoPrint = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
);

const IcoBack = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </svg>
);

const IcoHeart = ({ filled = false }: { filled?: boolean }) => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2}>
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

const IcoTrash = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);

const IcoCopy = () => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

const IcoGrid = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
  </svg>
);

const IcoToggle = () => (
  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <path d="M8 21h8M12 17v4" />
    <circle cx="7" cy="10" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="10" r="1.5" opacity=".4" fill="currentColor" stroke="none" />
    <circle cx="17" cy="10" r="1.5" opacity=".4" fill="currentColor" stroke="none" />
  </svg>
);

const IcoChev = ({ down = true }: { down?: boolean }) => (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
    style={{ transform: down ? 'none' : 'rotate(180deg)', transition: 'transform 0.2s' }}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// ─── Select component ───────────────────────────────────────────────────────────

function ModelSelect({
  printers,
  value,
  onChange,
  placeholder = 'Select model…',
}: {
  printers: { id: string; model_name: string }[];
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
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
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-base"
        style={{
          paddingLeft: 38,
          paddingRight: 32,
          appearance: 'none',
          cursor: 'pointer',
          fontWeight: value ? 600 : 400,
        }}
      >
        <option value="">{placeholder}</option>
        {printers.map((p) => (
          <option key={p.id} value={p.model_name}>
            {p.model_name}
          </option>
        ))}
      </select>
      <svg
        style={{
          position: 'absolute',
          right: 10,
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
        strokeWidth={2.5}
      >
        <path d="m6 9 6 6 6-6" />
      </svg>
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────────

export default function Home() {
  const [expandedSection, setExpandedSection] = useState<'errors' | 'parts' | null>(null);
  const [activeTab, setActiveTab] = useState<'parts' | 'maintenance'>('parts');

  // Common
  const [printers, setPrinters] = useState<{ id: string; model_name: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState('');

  // Errors
  const [codeQuery, setCodeQuery] = useState('');
  const [errorResults, setErrorResults] = useState<ErrorCode[]>([]);
  const [isPending, startTransition] = useTransition();
  const [dipSwitchTarget, setDipSwitchTarget] = useState<{ switch: number; bit: number } | null>(null);
  const [showDipSwitches, setShowDipSwitches] = useState(false);

  // Parts
  const [partSearchMode, setPartSearchMode] = useState<'smart' | 'section'>('smart');
  const [partSection, setPartSection] = useState('');
  const [partSectionsList, setPartSectionsList] = useState<string[]>([]);
  const [partResults, setPartResults] = useState<Part[]>([]);
  const [partLoading, setPartLoading] = useState(false);
  const [selectedModelFilter, setSelectedModelFilter] = useState('');

  // Cart / favorites
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Maintenance
  const [maintenanceData, setMaintenanceData] = useState<Record<string, MaintenanceSection[]>>({});
  const [selectedMaintenanceModel, setSelectedMaintenanceModel] = useState('C4065');
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});

  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

  // ─── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    getPrinters().then((data) => {
      const unique = Array.from(new Set(data.map((p) => p.model_name))).map(
        (name) => data.find((p) => p.model_name === name)!,
      );
      setPrinters(unique);
    });
    const saved = localStorage.getItem('parts_cart');
    if (saved) setCart(JSON.parse(saved));
  }, []);

  useEffect(() => {
    fetch('/data/maintenance_all.json')
      .then((r) => r.json())
      .then(setMaintenanceData)
      .catch((e) => console.error('Failed to load maintenance', e));
  }, []);

  useEffect(() => {
    localStorage.setItem('parts_cart', JSON.stringify(cart));
  }, [cart]);

  // Load sections when model changes
  useEffect(() => {
    if (selectedModel && expandedSection === 'parts' && partSearchMode === 'section') {
      fetch(`${API_BASE}/api/parts/sections?model=${selectedModel}`)
        .then((r) => r.json())
        .then(setPartSectionsList)
        .catch(console.error);
      setPartSection('');
    }
  }, [selectedModel, expandedSection, partSearchMode, API_BASE]);

  // Auto-search on section change
  useEffect(() => {
    if (expandedSection === 'parts' && partSearchMode === 'section' && selectedModel && partSection) {
      doSearchParts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partSection, partSearchMode]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleErrorSearch = (overrideCode?: string) => {
    if (!selectedModel) return;
    const query = overrideCode !== undefined ? overrideCode : codeQuery;
    if (!query.trim()) { setErrorResults([]); return; }
    startTransition(async () => {
      const data = await searchErrors(selectedModel, query, true);
      setErrorResults(data);
    });
  };

  const onDipSwitchClick = (sw: number, bit: number) => {
    setDipSwitchTarget({ switch: sw, bit });
    setShowDipSwitches(true);
  };

  const doSearchParts = async () => {
    if (!selectedModel) return;
    setPartLoading(true);
    let url = `${API_BASE}/api/parts?limit=500&fuzzy=true&model=${selectedModel}`;
    if (partSearchMode === 'section' && partSection) url += `&section=${encodeURIComponent(partSection)}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      setPartResults(data);
    } catch { toast.error('Search failed'); }
    finally { setPartLoading(false); }
  };

  const addToCart = (part: Part) => {
    const item: CartItem = { ...part, cartId: Math.random().toString(36).slice(2, 9) };
    setCart((c) => [...c, item]);
    toast.success('Added to favorites');
    setIsCartOpen(true);
  };

  const removeFromCart = (cartId: string) => setCart((c) => c.filter((i) => i.cartId !== cartId));

  const copyCart = () => {
    const text = cart
      .map((i) => `${i.part_code} - ${i.name} | Qty: ${i.quantity || '1'} | ${i.model}`)
      .join('\n');
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const printCart = () => {
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(`<html><head><title>Parts List</title>
        <style>body{font-family:Arial,sans-serif;padding:20px}
        table{width:100%;border-collapse:collapse;margin-top:20px}
        th,td{border:1px solid #ddd;padding:8px;text-align:left}
        th{background:#f2f2f2}</style></head><body>
        <h1>Selected Favorites</h1><table>
        <thead><tr><th>Code</th><th>Name</th><th>Qty</th><th>Model</th><th>Section</th></tr></thead>
        <tbody>${cart.map((i) => `<tr><td>${i.part_code}</td><td>${i.name}</td><td>${i.quantity ?? '1'}</td><td>${i.model}</td><td>${i.section_name}</td></tr>`).join('')}
        </tbody></table></body></html>`);
      w.document.close();
      w.print();
    }
  };

  const uniqueId = (p: Part | CartItem) =>
    `${p.model}-${p.page_number}-${p.part_code}-${p.section_name}-${p.ref_number}`;

  // ─── HOMEPAGE ────────────────────────────────────────────────────────────────

  if (!expandedSection) {
    return (
      <main
        className="bg-dots"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: 'absolute',
            top: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56,189,248,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(248,113,113,0.05) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 60, maxWidth: 560 }}>

          <h1
            style={{
              fontSize: 'clamp(2rem, 5vw, 3.2rem)',
              fontWeight: 900,
              letterSpacing: '-0.04em',
              marginBottom: 10,
              lineHeight: 1.1,
            }}
          >
            <span className="text-gradient-brand">KM Insight</span>
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: 8 }}>
            Advanced Service Intelligence & Diagnostics for Konica Minolta
          </p>

          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--amber)',
              opacity: 0.8,
              padding: '4px 12px',
              background: 'var(--amber-dim)',
              border: '1px solid rgba(251,191,36,0.2)',
              borderRadius: 999,
              display: 'inline-block',
            }}
          >
            ⚠️ Versione BETA — Non sostituisce il manuale tecnico ufficiale
          </p>
        </div>

        {/* Big action cards */}
        <div
          className="animate-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 680,
          }}
        >
          {/* Errors */}
          <button
            type="button"
            onClick={() => setExpandedSection('errors')}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 18,
              padding: '36px 28px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(56,189,248,0.4)';
              el.style.boxShadow = '0 8px 40px rgba(56,189,248,0.12)';
              el.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--border-default)';
              el.style.boxShadow = 'none';
              el.style.transform = 'none';
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, var(--accent), transparent)',
                borderRadius: '18px 18px 0 0',
              }}
            />
            <div style={{ color: 'var(--accent)', marginBottom: 16 }}>
              <IcoBug size={44} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 6 }}>Codici Errore</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Ricerca intelligente per codici errore con soluzioni, cause e ricambi consigliati.
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: '0.75rem',
                color: 'var(--accent)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Apri ricerca
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>

          {/* Parts */}
          <button
            type="button"
            onClick={() => setExpandedSection('parts')}
            style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border-default)',
              borderRadius: 18,
              padding: '36px 28px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(248,113,113,0.4)';
              el.style.boxShadow = '0 8px 40px rgba(248,113,113,0.1)';
              el.style.transform = 'translateY(-3px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--border-default)';
              el.style.boxShadow = 'none';
              el.style.transform = 'none';
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 3,
                background: 'linear-gradient(90deg, var(--red), transparent)',
                borderRadius: '18px 18px 0 0',
              }}
            />
            <div style={{ color: 'var(--red)', marginBottom: 16 }}>
              <IcoWrench size={44} />
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', marginBottom: 6 }}>Ricerca Parti</div>
            <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Catalogo ricambi per modello con sezioni, codici OEM e liste manutenzione.
            </div>
            <div
              style={{
                marginTop: 20,
                fontSize: '0.75rem',
                color: 'var(--red)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              Apri catalogo
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </button>
        </div>

        {/* Footer */}
        <div
          style={{
            marginTop: 60,
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
          }}
        >
          Developed by AISAC · KM Insight v3.0
        </div>
      </main>
    );
  }

  // ─── ERROR SECTION ───────────────────────────────────────────────────────────

  if (expandedSection === 'errors') {
    return (
      <main style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
        {/* Top bar */}
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            background: 'rgba(6,6,15,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid var(--border-subtle)',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <button
            type="button"
            className="btn btn-ghost"
            style={{ padding: '8px 14px', gap: 6 }}
            onClick={() => {
              setExpandedSection(null);
              setSelectedModel('');
              setErrorResults([]);
            }}
          >
            <IcoBack />
            Home
          </button>

          <div style={{ height: 20, width: 1, background: 'var(--border-subtle)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--accent)', display: 'flex' }}>
              <IcoBug size={18} />
            </span>
            <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Codici Errore</span>
          </div>

          <div style={{ flex: 1 }} />

          {selectedModel && (
            <button
              type="button"
              className="btn"
              style={{
                background: showDipSwitches ? 'var(--accent-dim)' : 'transparent',
                border: '1px solid',
                borderColor: showDipSwitches ? 'rgba(56,189,248,0.4)' : 'var(--border-default)',
                color: showDipSwitches ? 'var(--accent)' : 'var(--text-secondary)',
                gap: 6,
                fontSize: '0.82rem',
                padding: '7px 14px',
              }}
              onClick={() => setShowDipSwitches((v) => !v)}
            >
              <IcoToggle />
              DipSW Matrix
            </button>
          )}
        </header>

        <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px' }}>
          {/* Search panel */}
          <div
            className="surface animate-fade-up"
            style={{ padding: '20px', marginBottom: 20 }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
              <ModelSelect
                printers={printers}
                value={selectedModel}
                onChange={(v) => { setSelectedModel(v); setErrorResults([]); }}
                placeholder="Seleziona modello stampante…"
              />
              {selectedModel && (
                <span className="chip chip-blue" style={{ alignSelf: 'center', padding: '6px 12px', borderRadius: 8 }}>
                  {selectedModel}
                </span>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <AutocompleteSearch
                model={selectedModel}
                onSelect={(code) => { setCodeQuery(code); handleErrorSearch(code); }}
                onQueryChange={setCodeQuery}
                placeholder="Inserisci codice errore (es. C-0001)…"
              />
              <button
                type="button"
                className="btn btn-primary"
                style={{ height: 44, paddingLeft: 22, paddingRight: 22, gap: 6 }}
                onClick={() => handleErrorSearch()}
                disabled={isPending || !selectedModel}
              >
                {isPending ? (
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
          </div>

          {/* DipSwitch viewer overlay */}
          {showDipSwitches && selectedModel && (
            <DipSwitchViewer
              model={selectedModel}
              target={dipSwitchTarget}
              onClose={() => { setShowDipSwitches(false); setDipSwitchTarget(null); }}
            />
          )}

          {/* Results */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {errorResults.map((err) => (
              <ErrorCard key={err.id} error={err} onDipSwitchClick={onDipSwitchClick} model={selectedModel} />
            ))}

            {errorResults.length === 0 && !isPending && codeQuery && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  color: 'var(--text-secondary)',
                }}
              >
                <svg style={{ width: 48, height: 48, opacity: 0.3, display: 'block', margin: '0 auto 14px' }}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <div style={{ fontSize: '0.95rem' }}>Nessun risultato per «{codeQuery}»</div>
                <div style={{ fontSize: '0.8rem', marginTop: 6, opacity: 0.6 }}>
                  Prova un codice parziale o un termine diverso.
                </div>
              </div>
            )}

            {!codeQuery && errorResults.length === 0 && (
              <div
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                }}
              >
                Seleziona il modello e inserisci un codice errore per iniziare.
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  // ─── PARTS SECTION ──────────────────────────────────────────────────────────

  return (
    <main style={{ minHeight: '100vh', background: 'var(--bg-base)' }}>
      {/* Top bar */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'rgba(6,6,15,0.9)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: '8px 14px', gap: 6 }}
          onClick={() => {
            setExpandedSection(null);
            setSelectedModel('');
            setPartResults([]);
            setActiveTab('parts');
          }}
        >
          <IcoBack />
          Home
        </button>

        <div style={{ height: 20, width: 1, background: 'var(--border-subtle)' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--red)', display: 'flex' }}>
            <IcoWrench size={18} />
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Ricerca Parti</span>
        </div>

        {/* Section tabs */}
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {(['parts', 'maintenance'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              style={{
                background: activeTab === tab ? 'var(--red-dim)' : 'transparent',
                border: '1px solid',
                borderColor: activeTab === tab ? 'rgba(248,113,113,0.35)' : 'var(--border-subtle)',
                color: activeTab === tab ? 'var(--red)' : 'var(--text-secondary)',
                borderRadius: 8,
                padding: '5px 14px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'parts' ? 'Ricambi' : 'Manutenzione'}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Favorites button */}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ gap: 6, padding: '7px 14px', fontSize: '0.82rem', position: 'relative' }}
          onClick={() => setIsCartOpen(true)}
        >
          <span style={{ color: cart.length ? 'var(--red)' : 'var(--text-secondary)' }}>
            <IcoHeart filled={cart.length > 0} />
          </span>
          Preferiti
          {cart.length > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -4,
                right: -4,
                background: 'var(--red)',
                color: '#fff',
                fontSize: '0.62rem',
                fontWeight: 800,
                width: 18,
                height: 18,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cart.length}
            </span>
          )}
        </button>
      </header>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── SPARE PARTS TAB ──────────────────────────────────────────── */}
        {activeTab === 'parts' && (
          <div className="animate-fade-in">
            {/* Search controls */}
            <div className="surface" style={{ padding: 20, marginBottom: 20 }}>
              {/* Mode selector */}
              <div
                style={{
                  display: 'flex',
                  gap: 6,
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: '1px solid var(--border-subtle)',
                }}
              >
                <button
                  type="button"
                  onClick={() => setPartSearchMode('smart')}
                  style={{
                    background: partSearchMode === 'smart' ? 'rgba(248,113,113,0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: partSearchMode === 'smart' ? 'rgba(248,113,113,0.3)' : 'var(--border-subtle)',
                    color: partSearchMode === 'smart' ? 'var(--red)' : 'var(--text-secondary)',
                    borderRadius: 999,
                    padding: '5px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Smart Search
                </button>
                <button
                  type="button"
                  onClick={() => setPartSearchMode('section')}
                  style={{
                    background: partSearchMode === 'section' ? 'rgba(248,113,113,0.1)' : 'transparent',
                    border: '1px solid',
                    borderColor: partSearchMode === 'section' ? 'rgba(248,113,113,0.3)' : 'var(--border-subtle)',
                    color: partSearchMode === 'section' ? 'var(--red)' : 'var(--text-secondary)',
                    borderRadius: 999,
                    padding: '5px 16px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <IcoGrid />
                  &nbsp;Browse Sections
                </button>
              </div>

              {partSearchMode === 'smart' ? (
                <PartSearchAutocomplete
                  model=""
                  onResults={(results) => {
                    setPartResults(results);
                    setSelectedModelFilter(''); // Reset filter on new search
                  }}
                  onSelect={(part) => {
                    if (part) {
                      setPartResults([part]);
                      setSelectedModelFilter('');
                    }
                  }}
                  placeholder="Cerca codice parte o descrizione (ricerca globale)…"
                />
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <ModelSelect
                    printers={printers}
                    value={selectedModel}
                    onChange={(v) => { setSelectedModel(v); setPartSection(''); setPartResults([]); }}
                    placeholder="Seleziona modello…"
                  />
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
                      <path d="M4 6h16M4 12h8M4 18h4" />
                    </svg>
                    <select
                      value={partSection}
                      onChange={(e) => setPartSection(e.target.value)}
                      disabled={!selectedModel}
                      className="input-base"
                      style={{ paddingLeft: 38, paddingRight: 32, appearance: 'none', cursor: 'pointer' }}
                    >
                      <option value="">Seleziona sezione…</option>
                      {partSectionsList.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <svg
                      style={{
                        position: 'absolute',
                        right: 10,
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
                      strokeWidth={2.5}
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </div>
                </div>
              )}
            </div>

            {/* Results table */}
            {partResults.length > 0 && (
              <div className="surface" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                      Risultati{' '}
                      <span className="chip chip-neutral" style={{ marginLeft: 6 }}>
                        {partResults.length}
                      </span>
                    </span>

                    {partSearchMode === 'smart' && partResults.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 20 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filtra per modello:</span>
                        <select
                          value={selectedModelFilter}
                          onChange={(e) => setSelectedModelFilter(e.target.value)}
                          className="input-base"
                          style={{ height: 32, padding: '0 8px', fontSize: '0.75rem', width: 'auto' }}
                        >
                          <option value="">Tutti i modelli</option>
                          {Array.from(new Set(partResults.map(p => p.model))).sort().map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ overflowX: 'auto', maxHeight: 560, overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem' }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-elevated)', position: 'sticky', top: 0 }}>
                        {['Pg', 'Ref', 'Modello', 'Codice', 'Descrizione', 'Qty', 'Sezione', '♥'].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: '10px 12px',
                              textAlign: 'left',
                              fontWeight: 700,
                              fontSize: '0.7rem',
                              textTransform: 'uppercase',
                              letterSpacing: '0.08em',
                              color: 'var(--text-secondary)',
                              borderBottom: '1px solid var(--border-subtle)',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        const filtered = selectedModelFilter
                          ? partResults.filter(p => p.model === selectedModelFilter)
                          : partResults;

                        if (filtered.length === 0 && partResults.length > 0) {
                          return (
                            <tr>
                              <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                Nessun risultato per il modello selezionato.
                              </td>
                            </tr>
                          );
                        }

                        return filtered.map((part, idx) => {
                          const uid = uniqueId(part);
                          const isFav = cart.some((c) => uniqueId(c) === uid);
                          return (
                            <tr
                              key={uid || idx}
                              style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            >
                              <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{part.page_number}</td>
                              <td style={{ padding: '9px 12px', color: 'var(--text-secondary)' }}>{part.ref_number}</td>
                              <td style={{ padding: '9px 12px' }}>
                                <span className="chip chip-blue" style={{ fontSize: '0.68rem' }}>{part.model}</span>
                              </td>
                              <td style={{ padding: '9px 12px' }}>
                                <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700 }}>
                                  {part.part_code}
                                </span>
                              </td>
                              <td style={{ padding: '9px 12px', maxWidth: 260 }}>{part.name}</td>
                              <td style={{ padding: '9px 12px' }}>{part.quantity}</td>
                              <td style={{ padding: '9px 12px' }}>
                                <span className="chip chip-neutral" style={{ fontSize: '0.68rem', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>
                                  {part.section_name}
                                </span>
                              </td>
                              <td style={{ padding: '9px 12px' }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (isFav) {
                                      const item = cart.find((c) => uniqueId(c) === uid);
                                      if (item) { removeFromCart(item.cartId); toast.success('Rimosso dai preferiti'); }
                                    } else {
                                      addToCart(part);
                                    }
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: isFav ? 'var(--red)' : 'var(--text-muted)',
                                    padding: 4,
                                    display: 'flex',
                                    transition: 'color 0.1s',
                                  }}
                                >
                                  <IcoHeart filled={isFav} />
                                </button>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {partLoading && (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto' }} />
              </div>
            )}
          </div>
        )}

        {/* ── MAINTENANCE TAB ──────────────────────────────────────────── */}
        {activeTab === 'maintenance' && (
          <div className="animate-fade-in">
            <div className="surface" style={{ padding: '16px 20px', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 12 }}>Maintenance Schedule</div>
              <div style={{ maxWidth: 300 }}>
                <ModelSelect
                  printers={Object.keys(maintenanceData).sort().map((m) => ({ id: m, model_name: m }))}
                  value={selectedMaintenanceModel}
                  onChange={setSelectedMaintenanceModel}
                  placeholder="Seleziona modello…"
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {maintenanceData[selectedMaintenanceModel]?.map((section, idx) => {
                const isOpen = openAccordions[`m-${idx}`] ?? false;
                return (
                  <div key={idx} className="surface" style={{ overflow: 'hidden' }}>
                    <button
                      type="button"
                      className="accordion-header"
                      style={{ borderRadius: 0, padding: '13px 16px' }}
                      onClick={() =>
                        setOpenAccordions((prev) => ({ ...prev, [`m-${idx}`]: !isOpen }))
                      }
                    >
                      <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{section.name}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="chip chip-neutral" style={{ fontSize: '0.65rem' }}>
                          {section.items.length} parti
                        </span>
                        <IcoChev down={!isOpen} />
                      </div>
                    </button>
                    {isOpen && (
                      <div className="animate-fade-in">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                          <thead>
                            <tr style={{ background: 'var(--bg-elevated)' }}>
                              {['Codice', 'Descrizione', 'Qty', 'Vita (Yield)', '♥'].map((h) => (
                                <th
                                  key={h}
                                  style={{
                                    padding: '8px 12px',
                                    textAlign: 'left',
                                    fontWeight: 700,
                                    fontSize: '0.68rem',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.08em',
                                    color: 'var(--text-secondary)',
                                    borderBottom: '1px solid var(--border-subtle)',
                                  }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {section.items.map((item, i) => {
                              const mPart: Part = {
                                part_code: item.code,
                                name: item.name,
                                section_name: section.name,
                                model: selectedMaintenanceModel,
                                quantity: item.qty,
                                page_number: item.page_key?.split('-')[0] ?? '',
                                ref_number: `${section.name}-${i}`,
                              };
                              const uid = `${mPart.model}-${mPart.ref_number}-${mPart.part_code}`;
                              const isFav = cart.some((c) => `${c.model}-${c.ref_number}-${c.part_code}` === uid);
                              return (
                                <tr
                                  key={i}
                                  style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.1s' }}
                                  onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-elevated)')}
                                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                >
                                  <td style={{ padding: '8px 12px' }}>
                                    <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>
                                      {item.code}
                                    </span>
                                  </td>
                                  <td style={{ padding: '8px 12px' }}>{item.name}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{item.qty}</td>
                                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{item.life}</td>
                                  <td style={{ padding: '8px 12px' }}>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isFav) {
                                          const found = cart.find((c) => `${c.model}-${c.ref_number}-${c.part_code}` === uid);
                                          if (found) { removeFromCart(found.cartId); toast.success('Rimosso'); }
                                        } else {
                                          addToCart(mPart);
                                        }
                                      }}
                                      style={{
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: isFav ? 'var(--red)' : 'var(--text-muted)',
                                        padding: 4,
                                        display: 'flex',
                                        transition: 'color 0.1s',
                                      }}
                                    >
                                      <IcoHeart filled={isFav} />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── FAVORITES DRAWER ─────────────────────────────────────────────── */}
      {isCartOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 50,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsCartOpen(false); }}
        >
          <div
            className="animate-slide-l"
            style={{
              width: 360,
              background: 'var(--bg-card)',
              borderLeft: '1px solid var(--border-default)',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Drawer header */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: 'var(--red)' }}>
                  <IcoHeart filled={cart.length > 0} />
                </span>
                <span style={{ fontWeight: 700 }}>Preferiti</span>
                <span className="chip chip-neutral" style={{ fontSize: '0.7rem' }}>{cart.length}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
              >
                <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer items */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '50px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                  Nessuna parte nei preferiti
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.cartId}
                    style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid var(--border-subtle)',
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span className="mono" style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.82rem' }}>
                          {item.part_code}
                        </span>
                        {/* Qty controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginLeft: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => setCart((c) => c.map((ci) =>
                              ci.cartId === item.cartId
                                ? { ...ci, quantity: String(Math.max(1, parseInt(ci.quantity || '1') - 1)) }
                                : ci
                            ))}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                          >
                            −
                          </button>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, minWidth: 20, textAlign: 'center' }}>
                            {item.quantity || '1'}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCart((c) => c.map((ci) =>
                              ci.cartId === item.cartId
                                ? { ...ci, quantity: String(parseInt(ci.quantity || '1') + 1) }
                                : ci
                            ))}
                            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 4, width: 22, height: 22, cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginBottom: 3, lineHeight: 1.3 }}>{item.name}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                        {item.model} · {item.section_name}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartId)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--red)', padding: 4, flexShrink: 0, display: 'flex' }}
                    >
                      <IcoTrash />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Drawer footer */}
            <div
              style={{
                padding: '14px 20px',
                borderTop: '1px solid var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                className="btn btn-danger"
                style={{ width: '100%' }}
                onClick={() => { setCart([]); toast.success('Preferiti svuotati'); }}
              >
                <IcoTrash />
                Svuota preferiti
              </button>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.8rem' }}
                  onClick={copyCart}
                  disabled={cart.length === 0}
                >
                  <IcoCopy />
                  Copia
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ fontSize: '0.8rem' }}
                  onClick={printCart}
                  disabled={cart.length === 0}
                >
                  <IcoPrint size={14} />
                  Stampa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
