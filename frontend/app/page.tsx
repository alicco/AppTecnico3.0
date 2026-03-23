'use client';

import { useState, useEffect, useTransition, useRef } from 'react';
import { getPrinters, searchErrors, type ErrorCode } from '@/app/actions/search';
import { ErrorCard } from '@/components/ui/ErrorCard';
import { AutocompleteSearch } from '@/components/ui/AutocompleteSearch';
import { DipSwitchViewer } from '@/components/ui/DipSwitchViewer';
import { PartSearchAutocomplete, type Part } from '@/components/ui/PartSearchAutocomplete';
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
  const [partHasSearched, setPartHasSearched] = useState(false);
  const [partFilterModel, setPartFilterModel] = useState('');

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
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          position: 'relative',
          overflow: 'hidden',
          background: 'var(--bg-base)',
        }}
      >
        {/* Background layers */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '56px 56px',
        }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, transparent 10%, #0057a8 35%, #0057a8 65%, transparent 90%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: -280, right: -180, width: 700, height: 700,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,87,168,0.08) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -200, left: -200, width: 600, height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(200,16,46,0.05) 0%, transparent 60%)',
          pointerEvents: 'none',
        }} />

        {/* Hero section */}
        <div className="animate-fade-up" style={{ textAlign: 'center', marginBottom: 48, maxWidth: 780, width: '100%' }}>

          {/* Eyebrow label */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 20,
          }}>
            <div style={{ width: 28, height: 1, background: 'rgba(0,87,168,0.7)' }} />
            <span style={{
              fontSize: '0.62rem', letterSpacing: '0.4em', textTransform: 'uppercase',
              color: '#0076c0', fontWeight: 700,
            }}>
              Konica Minolta
            </span>
            <div style={{ width: 28, height: 1, background: 'rgba(0,87,168,0.7)' }} />
          </div>

          {/* Main title */}
          <h1 style={{ margin: 0, lineHeight: 1, marginBottom: 20 }}>
            <div style={{
              fontFamily: 'var(--font-syne)',
              fontSize: 'clamp(3rem, 9vw, 5.5rem)',
              fontWeight: 800,
              letterSpacing: '-0.04em',
              lineHeight: 0.9,
              color: 'var(--text-primary)',
              textTransform: 'uppercase',
            }}>
              Identity
            </div>
          </h1>

          {/* Divider line with accent dot */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, marginBottom: 20,
          }}>
            <div style={{ flex: 1, maxWidth: 120, height: 1, background: 'var(--border-subtle)' }} />
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#0076c0', margin: '0 12px' }} />
            <div style={{ flex: 1, maxWidth: 120, height: 1, background: 'var(--border-subtle)' }} />
          </div>

          <p style={{
            fontSize: '0.78rem', color: 'var(--text-secondary)',
            letterSpacing: '0.18em', textTransform: 'uppercase', fontWeight: 500,
            marginBottom: 28,
          }}>
            Piattaforma di diagnostica e ricerca tecnica
          </p>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '0.68rem', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
              padding: '5px 14px', borderRadius: 999,
              background: 'rgba(0,87,168,0.12)', border: '1px solid rgba(0,118,192,0.3)',
              color: '#38bdf8',
            }}>
              Service Tool v3.0
            </span>
            <span style={{
              fontSize: '0.68rem', fontWeight: 600,
              padding: '5px 14px', borderRadius: 999,
              background: 'var(--amber-dim)', border: '1px solid rgba(251,191,36,0.2)',
              color: 'var(--amber)',
            }}>
              BETA — Non sostituisce il manuale ufficiale
            </span>
          </div>
        </div>

        {/* Cards */}
        <div
          className="animate-fade-up"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 20,
            width: '100%',
            maxWidth: 740,
          }}
        >
          {/* Errors card — blue theme */}
          <button
            type="button"
            onClick={() => setExpandedSection('errors')}
            className="home-card"
            style={{
              background: 'linear-gradient(165deg, var(--bg-card) 0%, rgba(0,87,168,0.06) 100%)',
              border: '1px solid var(--border-default)',
              borderRadius: 20,
              padding: '36px 28px 28px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(0,87,168,0.5)';
              el.style.boxShadow = '0 16px 56px rgba(0,87,168,0.18), 0 0 0 1px rgba(0,87,168,0.15)';
              el.style.transform = 'translateY(-6px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--border-default)';
              el.style.boxShadow = 'none';
              el.style.transform = 'none';
            }}
          >
            {/* Top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, #0057a8 0%, #38bdf8 60%, transparent 100%)',
            }} />
            {/* Subtle glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(0,87,168,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: '1.6rem', marginBottom: 16 }}>&#9888;&#65039;</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 10, color: 'var(--text-primary)' }}>
              Codici Errore
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Ricerca per codice errore con cause, soluzioni e ricambi consigliati per ogni modello.
            </div>
            <div style={{
              fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(0,87,168,0.12)', border: '1px solid rgba(0,87,168,0.2)',
              display: 'inline-block',
            }}>
              Apri ricerca →
            </div>
          </button>

          {/* Parts card — red theme */}
          <button
            type="button"
            onClick={() => setExpandedSection('parts')}
            className="home-card"
            style={{
              background: 'linear-gradient(165deg, var(--bg-card) 0%, rgba(200,16,46,0.06) 100%)',
              border: '1px solid var(--border-default)',
              borderRadius: 20,
              padding: '36px 28px 28px',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.25s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'rgba(200,16,46,0.45)';
              el.style.boxShadow = '0 16px 56px rgba(200,16,46,0.15), 0 0 0 1px rgba(200,16,46,0.12)';
              el.style.transform = 'translateY(-6px)';
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget;
              el.style.borderColor = 'var(--border-default)';
              el.style.boxShadow = 'none';
              el.style.transform = 'none';
            }}
          >
            {/* Top accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(90deg, #c8102e 0%, #ff4d6d 60%, transparent 100%)',
            }} />
            {/* Subtle glow */}
            <div style={{
              position: 'absolute', top: -40, right: -40, width: 120, height: 120,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(200,16,46,0.10) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ fontSize: '1.6rem', marginBottom: 16 }}>&#128295;</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: 10, color: 'var(--text-primary)' }}>
              Ricerca Parti
            </div>
            <div style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 24 }}>
              Catalogo ricambi con sezioni, codici OEM e liste di manutenzione programmata.
            </div>
            <div style={{
              fontSize: '0.75rem', color: '#ff4d6d', fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              padding: '8px 16px', borderRadius: 10,
              background: 'rgba(200,16,46,0.12)', border: '1px solid rgba(200,16,46,0.2)',
              display: 'inline-block',
            }}>
              Apri catalogo →
            </div>
          </button>
        </div>

        {/* Stats row */}
        <div className="animate-fade-up" style={{
          display: 'flex', gap: 32, justifyContent: 'center', marginTop: 48,
          flexWrap: 'wrap',
        }}>
          {[
            { value: '15', label: 'Modelli supportati' },
            { value: '800+', label: 'Codici errore' },
            { value: '5000+', label: 'Parti catalogate' },
          ].map((stat) => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                {stat.value}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 2 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          marginTop: 48, fontSize: '0.7rem', color: 'var(--text-muted)',
          textAlign: 'center', letterSpacing: '0.04em',
        }}>
          Developed by AISAC · KonicaMinolta Identity v3.0
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
                  onSelect={(part) => { if (part) setPartResults([part]); }}
                  onResults={(parts) => { setPartResults(parts); setPartFilterModel(''); setPartHasSearched(true); }}
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
            {partResults.length > 0 && (() => {
              // Compute available models from results for filter
              const resultModels = [...new Set(partResults.map(p => p.model))].sort();
              const filteredParts = partFilterModel
                ? partResults.filter(p => p.model === partFilterModel)
                : partResults;

              return (
              <div className="surface" style={{ overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>
                    Risultati{' '}
                    <span className="chip chip-neutral" style={{ marginLeft: 6 }}>
                      {filteredParts.length}
                      {partFilterModel && ` / ${partResults.length}`}
                    </span>
                  </span>

                  {/* Model filter on results */}
                  {resultModels.length > 1 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Filtra modello:</span>
                      <select
                        value={partFilterModel}
                        onChange={(e) => setPartFilterModel(e.target.value)}
                        style={{
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-default)',
                          borderRadius: 8,
                          padding: '4px 10px',
                          fontSize: '0.78rem',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          appearance: 'auto',
                        }}
                      >
                        <option value="">Tutti ({partResults.length})</option>
                        {resultModels.map(m => (
                          <option key={m} value={m}>
                            {m} ({partResults.filter(p => p.model === m).length})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
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
                      {filteredParts.map((part, idx) => {
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
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              );
            })()}

            {/* No results message */}
            {partHasSearched && partResults.length === 0 && !partLoading && (
              <div className="surface" style={{ textAlign: 'center', padding: '40px 20px' }}>
                <svg width={40} height={40} viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth={1.5} style={{ margin: '0 auto 12px' }}>
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                  <path d="M8 11h6" />
                </svg>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500, marginBottom: 6 }}>
                  Nessun risultato trovato
                </p>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                  Prova con termini diversi o con un codice parte differente
                </p>
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
