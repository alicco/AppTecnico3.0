'use client';

import { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import {
  getPrinters,
  searchErrors,
  searchErrorsAllModels,
  searchPartsByCode,
  searchSpareParts,
  getModelSections,
  getDipSwitches,
  type ErrorCode,
  type ErrorResult,
  type Printer,
  type ManualSparePart,
  type DipSwitch
} from '@/app/actions/search';
import { normalizeCodeSync } from '@/app/utils/normalize';
import { DipSwitchViewer } from '@/components/ui/DipSwitchViewer';

// ─── TYPES ──────────────────────────────────────────────────────────
type Tab = 'errors' | 'parts' | 'scan';
type FavItem = { code: string; description: string; printer: string; id: string };

// ─── SVG ICONS (Skeuomorphic Style) ───────────────────────────────
const IconSearch = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>;
const IconBox = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" /></svg>;
const IconScan = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" /></svg>;
const IconStar = ({ filled }: { filled?: boolean }) => <svg width="18" height="18" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconCopy = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
const IconPrint = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
const IconChev = ({ open }: { open: boolean }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.22s ease' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const IconCart = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5A1 1 0 006 19h14" /><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>;

// ─── UTILS ──────────────────────────────────────────────────────────
function copyText(text: string) {
  navigator.clipboard.writeText(text).catch(() => { });
}

// ─── DEBOUNCE HOOK ──────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

// ─── ERROR CARD ─────────────────────────────────────────────────────
function ErrorResultCard({ error, onToggleFav, isFav, highlightPart, onShowDip }: {
  error: ErrorResult;
  onToggleFav: (e: ErrorCode, name: string) => void;
  isFav: boolean;
  highlightPart?: (code: string) => void;
  onShowDip?: (model: string, sw?: number, bit?: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = [
    { label: 'Causa', key: 'cause' },
    { label: 'Misure', key: 'measures' },
    { label: 'Soluzione', key: 'solution' },
    { label: 'Parti Anomale', key: 'estimated_abnormal_parts' },
    { label: 'Parti Guaste', key: 'faulty_part_isolation' },
    { label: 'Correzione', key: 'correction' },
    { label: 'Nota', key: 'note' },
  ];

  const classification = error.classification as string | undefined;

  // Regex for DipSwitch (e.g. SW 1-2, DIPSW 2-3)
  const renderLinkedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(SW\s+\d+-\d+|DIPSW\s+\d+-\d+|[A-Z0-9]{10})/gi);
    return parts.map((part, i) => {
      if (/SW\s+(\d+)-(\d+)|DIPSW\s+(\d+)-(\d+)/i.test(part)) {
        const match = part.match(/(?:SW|DIPSW)\s+(\d+)-(\d+)/i);
        const sw = match ? parseInt(match[1]) : 0;
        const bit = match ? parseInt(match[2]) : 0;
        return <span key={i} className="link-text" onClick={(e) => { e.stopPropagation(); onShowDip?.(error.model_name, sw, bit); }}>{part}</span>;
      }
      if (/^[A-Z0-9]{10}$/.test(part)) {
        return <span key={i} className="link-text" onClick={(e) => { e.stopPropagation(); highlightPart?.(part); }}>{part}</span>;
      }
      return part;
    });
  };

  return (
    <div className="result-card animate-in" style={{ marginBottom: 12 }}>
      <div className="metal-panel" style={{ cursor: 'pointer', padding: '16px 20px' }} onClick={() => setExpanded(!expanded)}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="badge badge-orange mono" style={{ fontSize: 16 }}>{error.code}</span>
              <span className="badge badge-blue">{error.model_name}</span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}>{error.classification || 'Diagnostica'}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              className={`fav-btn ${isFav ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); onToggleFav(error, error.model_name); }}
            >
              <IconStar filled={isFav} />
            </button>
            <IconChev open={expanded} />
          </div>
        </div>

        {expanded && (
          <div className="animate-in" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {fields.map(f => {
              const val = error[f.key] as string;
              if (!val) return null;
              return (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--accent-orange)', marginBottom: 4, textTransform: 'uppercase' }}>{f.label}</p>
                  <p style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.5 }}>{renderLinkedText(val)}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <style jsx>{`
        .fav-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          cursor: pointer;
          transition: color 0.2s;
        }
        .fav-btn.active { color: var(--accent-orange); }
        .link-text {
          color: var(--accent-blue);
          text-decoration: underline;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ─── PART ROW ─────────────────────────────────────────────────────
function PartRow({ part, onAdd }: { part: ManualSparePart; onAdd: (p: ManualSparePart) => void }) {
  return (
    <div className="metal-panel animate-in" style={{ marginBottom: 10, padding: '12px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span className="badge badge-orange mono">{part.part_code}</span>
            <span className="badge badge-blue">{part.model}</span>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{part.name}</p>
          {part.section_name && <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>{part.section_name} • Rif. {part.ref_number}</p>}
        </div>
        <button className="skeuo-btn skeuo-btn-orange" onClick={() => onAdd(part)} style={{ padding: '8px 12px', minWidth: 40, fontSize: 20 }}>+</button>
      </div>
    </div>
  );
}

// ─── ERROR VIEW ───────────────────────────────────────────────────
function ErrorsView({ selectedPrinter, onToggleFav, favorites, onHighlightPart, onShowDip }: {
  selectedPrinter: Printer;
  onToggleFav: (e: ErrorCode, name: string) => void;
  favorites: FavItem[];
  onHighlightPart: (code: string) => void;
  onShowDip: (model: string, sw?: number, bit?: number) => void;
}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<ErrorResult[]>([]);
  const [results, setResults] = useState<ErrorResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (debouncedQuery.length < 2) { setSuggestions([]); return; }
    (async () => {
      const data = await searchErrorsAllModels(debouncedQuery, [selectedPrinter]);
      setSuggestions(data);
    })();
  }, [debouncedQuery, selectedPrinter]);

  const handleSearch = async (q = query) => {
    if (!q) return;
    setLoading(true);
    setShowSuggestions(false);
    const data = await searchErrorsAllModels(q, [selectedPrinter], 20);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="tab-view animate-in">
      <div className="metal-panel-deep" style={{ padding: 24, marginBottom: 24, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div className="led-dot led-orange active" />
          <span className="mono" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>UNITÀ DIAGNOSTICA CENTRALE</span>
        </div>

        <div style={{ position: 'relative' }}>
          <input
            className="skeuo-input mono"
            style={{ fontSize: 22, height: 60, background: 'var(--lcd-bg)', color: 'var(--lcd-green)', border: '2px solid #000' }}
            type="text"
            placeholder="DIGITA CODICE ERRORE..."
            value={query}
            onChange={(e) => { setQuery(e.target.value.toUpperCase()); setShowSuggestions(true); }}
            onFocus={() => setShowSuggestions(true)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="skeuo-dropdown">
              {suggestions.map((s, i) => (
                <div key={i} className="dropdown-item" onClick={() => { setQuery(s.code); handleSearch(s.code); }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--accent-orange)', fontWeight: 800 }}>{s.code}</span>
                    <span className="badge badge-blue">{s.model_name}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {s.cause}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button className="skeuo-btn skeuo-btn-blue" style={{ width: '100%', marginTop: 16, height: 50 }} onClick={() => handleSearch()} disabled={loading}>
          {loading ? <span className="spinner" /> : <><IconSearch /> ANALIZZA SISTEMA</>}
        </button>
      </div>

      <div style={{ paddingBottom: 100 }}>
        {results.length > 0 ? (
          results.map((res, i) => (
            <ErrorResultCard
              key={i}
              error={res}
              onToggleFav={onToggleFav}
              isFav={favorites.some(f => f.id === res.id)}
              highlightPart={onHighlightPart}
              onShowDip={onShowDip}
            />
          ))
        ) : !loading && query && (
          <div style={{ textAlign: 'center', padding: 40, opacity: 0.5 }}>
            <IconSearch />
            <p>Nessuna corrispondenza trovata.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PARTS VIEW ───────────────────────────────────────────────────
function PartsView({ selectedPrinter, onAddToCart, initialQuery }: {
  selectedPrinter: Printer;
  onAddToCart: (p: ManualSparePart) => void;
  initialQuery?: string;
}) {
  const [searchMode, setSearchMode] = useState<'code' | 'model'>('code');
  const [query, setQuery] = useState(initialQuery || '');
  const [results, setResults] = useState<ManualSparePart[]>([]);
  const [loading, setLoading] = useState(false);

  // Model search state
  const [selPrinter, setSelPrinter] = useState('');
  const [sections, setSections] = useState<string[]>([]);
  const [selSection, setSelSection] = useState('');

  useEffect(() => { if (initialQuery) { setQuery(initialQuery); handleGlobalSearch(initialQuery); } }, [initialQuery]);

  useEffect(() => {
    if (selectedPrinter) {
      getModelSections(selectedPrinter.model_name).then(setSections);
    } else { setSections([]); }
  }, [selectedPrinter]);

  const handleGlobalSearch = async (q = query) => {
    if (!q) return;
    setLoading(true);
    const data = await searchPartsByCode(q);
    setResults(data);
    setLoading(false);
  };

  const handleModelSearch = async () => {
    if (!selectedPrinter) return;
    setLoading(true);
    const data = await searchSpareParts(selectedPrinter.model_name, query, selSection);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="tab-view animate-in">
      <div className="metal-panel" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 4, background: '#000', padding: 4, borderRadius: 12, marginBottom: 20 }}>
          <button className={`mode-tab ${searchMode === 'code' ? 'active' : ''}`} onClick={() => setSearchMode('code')}>RICERCA CODICE</button>
          <button className={`mode-tab ${searchMode === 'model' ? 'active' : ''}`} onClick={() => setSearchMode('model')}>MODELLO/SEZIONE</button>
        </div>

        <div className="lcd-display" style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <input
              className="skeuo-input"
              style={{ background: 'transparent', border: 'none', color: 'var(--lcd-green)', fontSize: 18, padding: 0 }}
              placeholder="INSERIRE STRINGA..."
              value={query}
              onChange={e => setQuery(e.target.value.toUpperCase())}
            />
            <button className="skeuo-btn skeuo-btn-blue" style={{ height: 40, padding: '0 15px' }} onClick={() => searchMode === 'code' ? handleGlobalSearch() : handleModelSearch()}>
              {loading ? <span className="spinner" /> : <IconSearch />}
            </button>
          </div>
        </div>

        {searchMode === 'model' && (
          <div className="animate-in" style={{ display: 'flex', gap: 10 }}>
            <div className="skeuo-input" style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)', opacity: 0.7 }}>
              <span className="mono" style={{ fontSize: 12, paddingLeft: 10 }}>UNITÀ: {selectedPrinter.model_name}</span>
            </div>
            <select className="skeuo-input" style={{ flex: 1 }} value={selSection} onChange={e => setSelSection(e.target.value)}>
              <option value="">TUTTE LE SEZIONI</option>
              {sections.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        )}
      </div>

      <div style={{ paddingBottom: 100 }}>
        {results.map((p, i) => <PartRow key={i} part={p} onAdd={onAddToCart} />)}
      </div>

      <style jsx>{`
        .mode-tab { flex: 1; padding: 10px; border: none; background: transparent; color: #555; font-weight: 800; font-size: 11px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .mode-tab.active { background: var(--bg-metal-light); color: var(--accent-orange); box-shadow: var(--skeuo-raised); }
      `}</style>
    </div>
  );
}

// ─── SCAN VIEW ────────────────────────────────────────────────────
function ScanView({ onScanComplete }: { onScanComplete: (code: string) => void }) {
  return (
    <div className="tab-view animate-in">
      <div className="metal-panel-deep" style={{ padding: 40, textAlign: 'center' }}>
        <div style={{ width: 120, height: 120, margin: '0 auto 24px', background: 'var(--lcd-bg)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #000', boxShadow: '0 0 30px var(--lcd-green)22' }}>
          <IconScan />
        </div>
        <h2 style={{ fontSize: 24, color: 'var(--accent-orange)', marginBottom: 12 }}>SCANNER OTTICO</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 30 }}>Inquadra il codice a barre del ricambio per l'identificazione immediata.</p>

        <div className="lcd-display" style={{ padding: 20 }}>
          <p className="mono" style={{ fontSize: 13, marginBottom: 10, opacity: 0.7 }}>STATUS: IN ATTESA DI INPUT...</p>
          <div style={{ height: 2, background: 'var(--lcd-green)', opacity: 0.2, marginBottom: 20 }} />
          <button className="skeuo-btn skeuo-btn-orange" style={{ width: '100%', height: 60, fontSize: 18 }} onClick={() => alert('Camera non disponibile in questa demo')}>ATTIVA CAMERA</button>
        </div>
      </div>
    </div>
  );
}

// ─── DRAWER COMPONENT ──────────────────────────────────────────────
function DrawerPanel({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer-content metal-texture">
        <div className="drawer-header">
          <span className="mono">{title}</span>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        <div className="drawer-body">{children}</div>
      </div>
      <style jsx>{`
        .drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 1000; backdrop-filter: blur(4px); }
        .drawer-content { position: fixed; right: 0; top: 0; bottom: 0; width: 100%; max-width: 400px; background: var(--bg-carbonite); border-left: 2px solid var(--border-metal); z-index: 1001; display: flex; flexDirection: column; animation: slideIn 0.3s ease-out; }
        .drawer-header { padding: 20px; border-bottom: 1px solid var(--border-metal); display: flex; justify-content: space-between; align-items: center; background: var(--bg-metal-dark); }
        .drawer-body { flex: 1; overflow-y: auto; padding: 20px; }
        .close-btn { background: none; border: none; color: var(--text-muted); fontSize: 32px; cursor: pointer; }
        @keyframes slideIn { from { transform: translateX(100%); } to { transform: translateX(0); } }
      `}</style>
    </>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
export default function AppTecnico() {
  const [activeTab, setActiveTab] = useState<Tab>('errors');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);
  const [cart, setCart] = useState<ManualSparePart[]>([]);
  const [favorites, setFavorites] = useState<FavItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFavs, setShowFavs] = useState(false);
  const [pendingPartCode, setPendingPartCode] = useState<string | undefined>();
  const [loadingPrinters, setLoadingPrinters] = useState(true);

  // DipSwitch State
  const [dipModal, setDipModal] = useState<{ model: string; target: { switch: number; bit?: number } | null } | null>(null);

  useEffect(() => {
    getPrinters().then(data => {
      setPrinters(data);
      setLoadingPrinters(false);
    });
  }, []);

  // Persist cart/favs/printer
  useEffect(() => {
    const c = localStorage.getItem('app-cart');
    const f = localStorage.getItem('app-favs');
    const p = localStorage.getItem('app-selected-printer');
    if (c) setCart(JSON.parse(c));
    if (f) setFavorites(JSON.parse(f));
    if (p) setSelectedPrinter(JSON.parse(p));
  }, []);

  useEffect(() => { localStorage.setItem('app-cart', JSON.stringify(cart)); }, [cart]);
  useEffect(() => { localStorage.setItem('app-favs', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => {
    if (selectedPrinter) localStorage.setItem('app-selected-printer', JSON.stringify(selectedPrinter));
    else localStorage.removeItem('app-selected-printer');
  }, [selectedPrinter]);

  const toggleFav = (e: ErrorCode, printer: string) => {
    const id = `${printer}::${e.code}`;
    if (favorites.some(f => f.id === id)) {
      setFavorites(favorites.filter(f => f.id !== id));
    } else {
      setFavorites([...favorites, { code: e.code, description: e.cause || '', printer, id }]);
    }
  };

  const jumpToPart = (code: string) => {
    setPendingPartCode(code);
    setActiveTab('parts');
  };

  // ─── VIEW: SELECTION (Industrial Gateway) ──────────────────────
  if (!selectedPrinter) {
    return (
      <div className="metal-texture" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div className="hw-panel animate-in" style={{ width: '100%', maxWidth: 700, textAlign: 'center' }}>

          {/* Main Title Plate */}
          <div style={{ marginBottom: 40 }}>
            <div className="led-dot led-orange active" style={{ width: 14, height: 14, margin: '0 auto 15px' }} />
            <div className="metal-panel-inner" style={{ display: 'inline-block', padding: '10px 40px', border: '1px solid #444' }}>
              <h1 className="mono" style={{ fontSize: 24, fontWeight: 900, letterSpacing: 2, margin: 0 }}>
                ROOT<span style={{ color: 'var(--accent-orange)' }}>ACCESS</span> 3.0
              </h1>
            </div>
            <p className="mono" style={{ fontSize: 10, color: '#666', marginTop: 15, letterSpacing: 3 }}>
              SELECT HARDWARE UNIT TO INITIALIZE ECOSYS
            </p>
          </div>

          {/* Main Selection Grid */}
          <div className="hw-grid">
            {loadingPrinters ? (
              <div style={{ gridColumn: '1 / -1', padding: 40 }}>
                <div className="spinner" style={{ margin: '0 auto 20px' }} />
                <span className="mono" style={{ color: 'var(--lcd-green)' }}>SYNCING WITH DATABASE...</span>
              </div>
            ) : (
              printers.map(p => (
                <div key={p.id} className="hw-button-container">
                  <button
                    className="hw-button"
                    onClick={() => setSelectedPrinter(p)}
                    title={p.model_name}
                  >
                    <div className="hw-led" />
                    <div className="mono" style={{
                      position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                      fontSize: 10, color: '#fff', fontWeight: 900, opacity: 0.8
                    }}>
                      {p.model_name.slice(0, 5)}
                    </div>
                  </button>
                  <span className="hw-label">{p.model_name}</span>
                </div>
              ))
            )}
          </div>

          {/* Footer Warning */}
          <div style={{ marginTop: 50, paddingTop: 20, borderTop: '1px dashed #333' }}>
            <p className="mono" style={{ fontSize: 9, color: '#444' }}>
              WARNING: UNAUTHORIZED SELECTION MAY LEAD TO SYSTEM COMPROMISE.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── VIEW: ACTIVE APP ───────────────────────────────────────────
  return (
    <div className="metal-texture" style={{ minHeight: '100vh', paddingBottom: 100 }}>
      {/* HEADER */}
      <header className="app-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }} onClick={() => setSelectedPrinter(null)}>
          <div className="led-dot led-green active" />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1 }}>SYSTEM ACTIVE:</span>
            <h1 className="mono" style={{ fontSize: 16, fontWeight: 900, margin: 0, color: 'var(--accent-orange)' }}>{selectedPrinter.model_name}</h1>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="badge" style={{ cursor: 'pointer', border: 'none' }} onClick={() => setShowFavs(true)}>
            <IconStar filled /> {favorites.length}
          </button>
          <button className="badge badge-orange" style={{ cursor: 'pointer' }} onClick={() => setShowCart(true)}>
            <IconCart /> {cart.length}
          </button>
        </div>
      </header>

      {/* CONTENT AREA */}
      <main style={{ padding: 20 }}>
        {activeTab === 'errors' && selectedPrinter && (
          <ErrorsView
            selectedPrinter={selectedPrinter}
            onToggleFav={toggleFav}
            favorites={favorites}
            onHighlightPart={jumpToPart}
            onShowDip={(model, sw, bit) => setDipModal({ model, target: sw ? { switch: sw, bit } : null })}
          />
        )}
        {activeTab === 'parts' && selectedPrinter && <PartsView selectedPrinter={selectedPrinter} onAddToCart={p => setCart([...cart, p])} initialQuery={pendingPartCode} />}
        {activeTab === 'scan' && <ScanView onScanComplete={jumpToPart} />}
      </main>

      {/* BOTTOM NAV */}
      <nav className="bottom-nav">
        <div className={`nav-item ${activeTab === 'errors' ? 'active' : ''}`} onClick={() => setActiveTab('errors')}>
          <IconSearch />
          <span className="mono" style={{ fontSize: 10 }}>ERRORI</span>
        </div>
        <div className={`nav-item ${activeTab === 'parts' ? 'active' : ''}`} onClick={() => setActiveTab('parts')}>
          <IconBox />
          <span className="mono" style={{ fontSize: 10 }}>RICAMBI</span>
        </div>
        <div className={`nav-item ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
          <IconScan />
          <span className="mono" style={{ fontSize: 10 }}>SCAN</span>
        </div>
      </nav>

      {/* DRAWERS */}
      <DrawerPanel open={showCart} onClose={() => setShowCart(false)} title="CARRELLO RICAMBI">
        {cart.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.5 }}>Carrello vuoto.</p> : (
          <div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
              <button className="skeuo-btn skeuo-btn-blue" style={{ flex: 1, fontSize: 11 }} onClick={() => copyText(cart.map(i => `${i.part_code} - ${i.name}`).join('\n'))}><IconCopy /> COPIA</button>
              <button className="skeuo-btn skeuo-btn-orange" style={{ flex: 1, fontSize: 11 }} onClick={() => window.print()}><IconPrint /> STAMPA</button>
            </div>
            {cart.map((item, idx) => (
              <div key={idx} style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p className="mono" style={{ fontSize: 13, color: 'var(--accent-orange)', margin: 0 }}>{item.part_code}</p>
                  <p style={{ fontSize: 11, margin: 0 }}>{item.name}</p>
                </div>
                <button style={{ color: 'red', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setCart(cart.filter((_, i) => i !== idx))}>×</button>
              </div>
            ))}
          </div>
        )}
      </DrawerPanel>

      <DrawerPanel open={showFavs} onClose={() => setShowFavs(false)} title="CODICI PREFERITI">
        {favorites.length === 0 ? <p style={{ textAlign: 'center', opacity: 0.5 }}>Nessun preferito.</p> : (
          favorites.map((f, idx) => (
            <div key={idx} style={{ marginBottom: 12, padding: 12, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span className="badge badge-orange">{f.code}</span>
                <span className="badge badge-blue">{f.printer}</span>
              </div>
              <p style={{ fontSize: 12, marginTop: 8, opacity: 0.8 }}>{f.description}</p>
            </div>
          ))
        )}
      </DrawerPanel>

      {dipModal && (
        <DipSwitchViewer
          model={dipModal.model}
          target={dipModal.target}
          onClose={() => setDipModal(null)}
        />
      )}
    </div>
  );
}
