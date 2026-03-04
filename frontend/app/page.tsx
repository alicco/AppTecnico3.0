'use client';

import { useState, useEffect, useTransition } from 'react';
import { getPrinters, searchErrors, searchSpareParts, type ErrorCode, type Printer, type ManualSparePart } from '@/app/actions/search';

type Tab = 'home' | 'errors' | 'parts' | 'scan';
type FavItem = { code: string; description: string; printer: string; id: string };
type AccordionPanel = 'none' | 'errors' | 'parts' | 'scan';

const IconHome  = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0h6" /></svg>;
const IconSearch = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><circle cx="11" cy="11" r="8" /><path strokeLinecap="round" d="M21 21l-4.35-4.35" /></svg>;
const IconBox   = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0v10l-8 4m-8-4V7m16 0L12 11M4 7l8 4" /></svg>;
const IconScan  = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2M3 12h18" /></svg>;
const IconStar  = ({ filled }: { filled?: boolean }) => <svg width="18" height="18" fill={filled ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>;
const IconCopy  = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>;
const IconPrint = () => <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M6 9V2h12v7" /><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" /><rect x="6" y="14" width="12" height="8" /></svg>;
const IconChev  = ({ open }: { open: boolean }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ transform: open ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.22s ease' }}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
const IconCart  = () => <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.3 5A1 1 0 006 19h14" /><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /></svg>;
const IconBarcode = () => <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><rect x="2" y="4" width="2" height="16" rx="0.5" fill="currentColor" stroke="none"/><rect x="6" y="4" width="1" height="16" rx="0.5" fill="currentColor" stroke="none"/><rect x="9" y="4" width="2" height="16" rx="0.5" fill="currentColor" stroke="none"/><rect x="13" y="4" width="1" height="16" rx="0.5" fill="currentColor" stroke="none"/><rect x="16" y="4" width="2" height="16" rx="0.5" fill="currentColor" stroke="none"/><rect x="20" y="4" width="2" height="16" rx="0.5" fill="currentColor" stroke="none"/></svg>;

function copyText(text: string) { navigator.clipboard.writeText(text).catch(() => {}); }

function ErrorResultCard({ error, printerName, onToggleFav, isFav }: {
  error: ErrorCode; printerName: string; onToggleFav: (e: ErrorCode) => void; isFav: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const fields = [
    { label: 'Causa', key: 'cause' },
    { label: 'Misure da Adottare', key: 'measures_to_take_when_an_alert_occurs' },
    { label: 'Soluzione', key: 'solution' },
    { label: 'Parti Anomale', key: 'estimated_abnormal_parts' },
    { label: 'Parti Guaste', key: 'faulty_part_isolation' },
    { label: 'Correzione', key: 'correction' },
    { label: 'Nota', key: 'note' },
  ];
  const classification = error.classification as string | undefined;
  const isError = classification?.toLowerCase().includes('e');
  function makeText() {
    let t = `STAMPANTE: ${printerName}\nCODICE: ${error.code}\n`;
    if (classification) t += `CLASSIFICAZIONE: ${classification}\n`;
    fields.forEach(f => { const v = error[f.key] as string | undefined; if (v) t += `${f.label.toUpperCase()}: ${v}\n`; });
    return t;
  }
  return (
    <div className="result-card animate-in" style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span className="error-code-big">{error.code}</span>
            {classification && <span className={`badge ${isError ? 'badge-orange' : 'badge-blue'}`}>{classification}</span>}
          </div>
          {error.cause && <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{String(error.cause).slice(0, 110)}{String(error.cause).length > 110 ? '\u2026' : ''}</p>}
        </div>
        <button onClick={() => onToggleFav(error)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: isFav ? 'var(--accent-orange)' : 'var(--text-muted)', padding: 4, flexShrink: 0 }} aria-label="Preferito"><IconStar filled={isFav} /></button>
      </div>
      <button onClick={() => setExpanded(e => !e)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 11, fontWeight: 700, cursor: 'pointer', marginTop: 10, padding: 0, fontFamily: 'inherit', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
        {expanded ? 'Nascondi' : 'Dettagli'} <IconChev open={expanded} />
      </button>
      {expanded && (
        <div style={{ marginTop: 12 }} className="animate-expand">
          {fields.map(f => { const val = error[f.key] as string | undefined; if (!val) return null; return (<div key={f.key} className="detail-row"><span className="detail-label">{f.label}</span><span className="detail-value">{val}</span></div>); })}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button className="icon-btn" onClick={() => copyText(makeText())}><IconCopy /> Copia</button>
            <button className="icon-btn" onClick={() => window.print()}><IconPrint /> Stampa</button>
          </div>
        </div>
      )}
    </div>
  );
}

function PartRow({ part, onAdd }: { part: ManualSparePart; onAdd: (p: ManualSparePart) => void }) {
  return (
    <div className="result-card animate-in" style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 5 }}>
            <span className="badge badge-green mono">{part.part_code}</span>
            {part.ref_number && <span className="badge badge-blue">Rif. {part.ref_number}</span>}
            {part.page_number && <span className="badge" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-muted)' }}>Pag. {part.page_number}</span>}
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.4 }}>{part.name}</p>
          {part.section_name && <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{part.section_name}</p>}
        </div>
        <button className="skeuo-btn skeuo-btn-orange" onClick={() => onAdd(part)} style={{ padding: '10px 16px', borderRadius: 10, flexDirection: 'row', gap: 4, fontSize: 18, minWidth: 42 }} aria-label="Aggiungi">+</button>
      </div>
    </div>
  );
}

function ErrorsAccordion({ printers, favorites, onToggleFav, isOpen }: {
  printers: Printer[]; favorites: FavItem[];
  onToggleFav: (e: ErrorCode, name: string) => void; isOpen: boolean;
}) {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ErrorCode[]>([]);
  const [isPending, startTransition] = useTransition();
  const [exactMatch, setExactMatch] = useState(false);
  const [searched, setSearched] = useState(false);
  const selectedPrinterName = printers.find(p => p.id === selectedPrinter)?.model_name ?? '';
  function doSearch() {
    if (!selectedPrinter) return;
    setSearched(true);
    startTransition(async () => { const data = await searchErrors(selectedPrinterName, query, exactMatch); setResults(data); });
  }
  if (!isOpen) return null;
  return (
    <div className="accordion-body animate-expand">
      <div className="select-wrapper" style={{ marginBottom: 12 }}>
        <select className="skeuo-select" value={selectedPrinter} onChange={e => { setSelectedPrinter(e.target.value); setResults([]); setSearched(false); }}>
          <option value="">— Scegli stampante —</option>
          {printers.map(p => <option key={p.id} value={p.id}>{p.model_name}</option>)}
        </select>
      </div>
      <input className="skeuo-input" type="text" placeholder="Es: C-240, E1234…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} disabled={!selectedPrinter} style={{ marginBottom: 12 }} />
      <div className="row-between" style={{ marginBottom: 14 }}>
        <label className="row-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <label className="toggle"><input type="checkbox" checked={exactMatch} onChange={e => setExactMatch(e.target.checked)} /><span className="toggle-slider" /></label>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif' }}>Match Esatto</span>
        </label>
      </div>
      <button className="skeuo-btn skeuo-btn-blue tech-btn-row" onClick={doSearch} disabled={!selectedPrinter || isPending}>
        {isPending ? <span className="spinner" /> : <IconSearch />}<span>{isPending ? 'Ricerca…' : 'Cerca Errori'}</span>
      </button>
      {searched && !isPending && results.length === 0 && <div className="empty-state"><div className="empty-icon">&#128269;</div><p>Nessun risultato</p></div>}
      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <span className="section-title" style={{ marginBottom: 0 }}>{results.length} risultat{results.length === 1 ? 'o' : 'i'}</span>
            <span className="badge badge-blue">{selectedPrinterName}</span>
          </div>
          {results.map(err => <ErrorResultCard key={err.id} error={err} printerName={selectedPrinterName} onToggleFav={e => onToggleFav(e, selectedPrinterName)} isFav={favorites.some(f => f.id === err.id)} />)}
        </div>
      )}
    </div>
  );
}

function PartsAccordion({ printers, cart, onAddToCart, isOpen }: {
  printers: Printer[]; cart: ManualSparePart[];
  onAddToCart: (p: ManualSparePart) => void; isOpen: boolean;
}) {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManualSparePart[]>([]);
  const [isPending, startTransition] = useTransition();
  const [fuzzy, setFuzzy] = useState(false);
  const [searched, setSearched] = useState(false);
  const selectedPrinterName = printers.find(p => p.id === selectedPrinter)?.model_name ?? '';
  function doSearch() {
    if (!selectedPrinter || !query.trim()) return;
    setSearched(true);
    startTransition(async () => { const data = await searchSpareParts(selectedPrinterName, query.trim(), fuzzy); setResults(data); });
  }
  if (!isOpen) return null;
  return (
    <div className="accordion-body animate-expand">
      <div className="select-wrapper" style={{ marginBottom: 12 }}>
        <select className="skeuo-select" value={selectedPrinter} onChange={e => { setSelectedPrinter(e.target.value); setResults([]); setSearched(false); }}>
          <option value="">— Scegli stampante —</option>
          {printers.map(p => <option key={p.id} value={p.id}>{p.model_name}</option>)}
        </select>
      </div>
      <input className="skeuo-input" type="text" placeholder="Nome o codice ricambio…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} disabled={!selectedPrinter} style={{ marginBottom: 12 }} />
      <div className="row-between" style={{ marginBottom: 14 }}>
        <label className="row-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
          <label className="toggle"><input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /><span className="toggle-slider" /></label>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif' }}>Ricerca Fuzzy</span>
        </label>
        {cart.length > 0 && <span className="badge badge-orange">&#128722; {cart.length}</span>}
      </div>
      <button className="skeuo-btn skeuo-btn-cyan tech-btn-row" onClick={doSearch} disabled={!selectedPrinter || !query.trim() || isPending}>
        {isPending ? <span className="spinner" /> : <IconBox />}<span>{isPending ? 'Ricerca…' : 'Cerca Ricambi'}</span>
      </button>
      {searched && !isPending && results.length === 0 && <div className="empty-state"><div className="empty-icon">&#128230;</div><p>Nessun ricambio trovato</p></div>}
      {results.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <div className="row-between" style={{ marginBottom: 10 }}>
            <span className="section-title" style={{ marginBottom: 0 }}>{results.length} ricamb{results.length === 1 ? 'io' : 'i'}</span>
            <span className="badge badge-blue">{selectedPrinterName}</span>
          </div>
          {results.map((part, i) => <PartRow key={`${part.part_code}-${i}`} part={part} onAdd={onAddToCart} />)}
        </div>
      )}
    </div>
  );
}

function ScanAccordion({ onNavigateWithCode, isOpen }: {
  onNavigateWithCode: (tab: Tab, code: string) => void; isOpen: boolean;
}) {
  const [code, setCode] = useState('');
  if (!isOpen) return null;
  return (
    <div className="accordion-body animate-expand">
      <div className="viewfinder" style={{ position: 'relative' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>&#128247;</div>
          <p style={{ fontSize: 11, color: 'rgba(0,255,157,0.40)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1px', textTransform: 'uppercase' }}>Scanner non attivo</p>
        </div>
        <div style={{ position: 'absolute', top: 12, left: 12, width: 22, height: 22, borderTop: '2px solid var(--accent-lcd)', borderLeft: '2px solid var(--accent-lcd)', borderRadius: '4px 0 0 0' }} />
        <div style={{ position: 'absolute', top: 12, right: 12, width: 22, height: 22, borderTop: '2px solid var(--accent-lcd)', borderRight: '2px solid var(--accent-lcd)', borderRadius: '0 4px 0 0' }} />
        <div style={{ position: 'absolute', bottom: 12, left: 12, width: 22, height: 22, borderBottom: '2px solid var(--accent-lcd)', borderLeft: '2px solid var(--accent-lcd)', borderRadius: '0 0 0 4px' }} />
        <div style={{ position: 'absolute', bottom: 12, right: 12, width: 22, height: 22, borderBottom: '2px solid var(--accent-lcd)', borderRight: '2px solid var(--accent-lcd)', borderRadius: '0 0 4px 0' }} />
      </div>
      <button className="skeuo-btn skeuo-btn-orange tech-btn-row" onClick={() => window.location.href = '/scan'} style={{ marginBottom: 14 }}>
        <IconBarcode /><span>Apri Scanner Fotocamera</span>
      </button>
      <div className="metal-divider" />
      <p className="section-title" style={{ marginTop: 14, marginBottom: 10 }}>Inserimento Manuale</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <input className="skeuo-input" type="text" placeholder="Es: C-240" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && code.trim()) onNavigateWithCode('errors', code.trim()); }} style={{ flex: 1 }} />
        <button className="skeuo-btn skeuo-btn-blue" onClick={() => { if (code.trim()) onNavigateWithCode('errors', code.trim()); }} style={{ padding: '14px 18px', flexDirection: 'row' }}><IconSearch /></button>
      </div>
    </div>
  );
}

function HomeView({ printers, favorites, cart, onToggleFav, onAddToCart, onNavigateWithCode }: {
  printers: Printer[]; favorites: FavItem[]; cart: ManualSparePart[];
  onToggleFav: (e: ErrorCode, name: string) => void;
  onAddToCart: (p: ManualSparePart) => void;
  onNavigateWithCode: (tab: Tab, code: string) => void;
}) {
  const [openPanel, setOpenPanel] = useState<AccordionPanel>('none');
  function toggle(panel: AccordionPanel) { setOpenPanel(prev => prev === panel ? 'none' : panel); }

  const panels: { id: AccordionPanel; label: string; sub: string; led: string; icon: React.ReactNode }[] = [
    { id: 'errors', label: 'Codici Errore',   sub: 'Diagnostica guasti',  led: 'led-orange', icon: <span style={{ fontSize: 22 }}>&#9888;&#65039;</span> },
    { id: 'parts',  label: 'Ricerca Ricambi', sub: 'Catalogo componenti', led: 'led-blue',   icon: <span style={{ fontSize: 22 }}>&#128297;</span> },
    { id: 'scan',   label: 'Scanner Codice',  sub: 'Barcode & manuale',   led: 'led-green',  icon: <span style={{ fontSize: 22 }}>&#128247;</span> },
  ];

  return (
    <div>
      <div className="metal-panel" style={{ padding: '20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, flexShrink: 0, background: 'linear-gradient(145deg, #252c3a 0%, #161c28 100%)', border: '1px solid rgba(255,255,255,0.10)', borderTopColor: 'rgba(255,255,255,0.18)', boxShadow: 'var(--shadow-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>&#128424;&#65039;</div>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.5px', fontFamily: 'Rajdhani, Inter, sans-serif', color: '#E8EDF5' }}>AppTecnico</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1.5px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif', marginTop: 2 }}>Assistenza Stampanti v3.0</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="led-dot led-green" /><span style={{ fontSize: 10, color: 'var(--accent-lcd)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.8px' }}>ONLINE</span></div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><div className="led-dot led-amber" /><span style={{ fontSize: 10, color: 'var(--accent-amber)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.8px' }}>DB LIVE</span></div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { val: 'Multi', label: 'Modelli', color: 'var(--accent-lcd)' },
          { val: 'Live',  label: 'Ricerca', color: 'var(--accent-orange)' },
          { val: 'AWS',   label: 'Cloud',   color: 'var(--accent-blue)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 17, fontWeight: 600, color: s.color, letterSpacing: '1px', marginBottom: 4, textShadow: `0 0 10px ${s.color}60` }}>{s.val}</div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1.2px', fontFamily: 'Rajdhani, sans-serif' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <p className="section-title" style={{ marginBottom: 12 }}>Pannello Operativo</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {panels.map(panel => {
          const isOpen = openPanel === panel.id;
          return (
            <div key={panel.id} className={`accordion-panel${isOpen ? ' expanded' : ''}`}>
              <div className="accordion-header" onClick={() => toggle(panel.id)}>
                <div className={`led-dot ${panel.led}${isOpen ? ' active' : ''}`} />
                <div style={{ fontSize: 20 }}>{panel.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Rajdhani, Inter, sans-serif', letterSpacing: '0.3px', color: isOpen ? 'var(--text-primary)' : 'var(--text-secondary)' }}>{panel.label}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif', marginTop: 1 }}>{panel.sub}</div>
                </div>
                <div style={{ color: 'var(--text-muted)', flexShrink: 0 }}><IconChev open={isOpen} /></div>
              </div>
              {panel.id === 'errors' && <ErrorsAccordion printers={printers} favorites={favorites} onToggleFav={onToggleFav} isOpen={isOpen} />}
              {panel.id === 'parts'  && <PartsAccordion  printers={printers} cart={cart} onAddToCart={onAddToCart} isOpen={isOpen} />}
              {panel.id === 'scan'   && <ScanAccordion   onNavigateWithCode={onNavigateWithCode} isOpen={isOpen} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ErrorsView({ printers, favorites, onToggleFav }: { printers: Printer[]; favorites: FavItem[]; onToggleFav: (e: ErrorCode, name: string) => void; }) {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ErrorCode[]>([]);
  const [isPending, startTransition] = useTransition();
  const [exactMatch, setExactMatch] = useState(false);
  const [searched, setSearched] = useState(false);
  const selectedPrinterName = printers.find(p => p.id === selectedPrinter)?.model_name ?? '';
  function doSearch() {
    if (!selectedPrinter) return;
    setSearched(true);
    startTransition(async () => { const data = await searchErrors(selectedPrinterName, query, exactMatch); setResults(data); });
  }
  return (
    <div>
      <div className="metal-panel-deep" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div className="led-dot led-orange active" />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent-orange)' }}>Diagnostica Errori</span>
        </div>
        <div className="select-wrapper" style={{ marginBottom: 12 }}><select className="skeuo-select" value={selectedPrinter} onChange={e => { setSelectedPrinter(e.target.value); setResults([]); setSearched(false); }}><option value="">— Scegli stampante —</option>{printers.map(p => <option key={p.id} value={p.id}>{p.model_name}</option>)}</select></div>
        <input className="skeuo-input" type="text" placeholder="Es: C-240, E1234…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} disabled={!selectedPrinter} style={{ marginBottom: 12 }} />
        <div className="row-between" style={{ marginBottom: 16 }}>
          <label className="row-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <label className="toggle"><input type="checkbox" checked={exactMatch} onChange={e => setExactMatch(e.target.checked)} /><span className="toggle-slider" /></label>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif' }}>Match Esatto</span>
          </label>
        </div>
        <button className="skeuo-btn skeuo-btn-blue tech-btn-row" onClick={doSearch} disabled={!selectedPrinter || isPending}>{isPending ? <span className="spinner" /> : <IconSearch />}<span>{isPending ? 'Ricerca in corso…' : 'Cerca Errori'}</span></button>
      </div>
      {searched && !isPending && results.length === 0 && <div className="empty-state"><div className="empty-icon">&#128269;</div><p>Nessun risultato trovato</p></div>}
      {results.length > 0 && (<><div className="row-between" style={{ marginBottom: 12 }}><span className="section-title" style={{ marginBottom: 0 }}>{results.length} risultat{results.length === 1 ? 'o' : 'i'}</span><span className="badge badge-orange">{selectedPrinterName}</span></div>{results.map(err => <ErrorResultCard key={err.id} error={err} printerName={selectedPrinterName} onToggleFav={e => onToggleFav(e, selectedPrinterName)} isFav={favorites.some(f => f.id === err.id)} />)}</>)}
    </div>
  );
}

function PartsView({ printers, cart, onAddToCart }: { printers: Printer[]; cart: ManualSparePart[]; onAddToCart: (p: ManualSparePart) => void; }) {
  const [selectedPrinter, setSelectedPrinter] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ManualSparePart[]>([]);
  const [isPending, startTransition] = useTransition();
  const [fuzzy, setFuzzy] = useState(false);
  const [searched, setSearched] = useState(false);
  const selectedPrinterName = printers.find(p => p.id === selectedPrinter)?.model_name ?? '';
  function doSearch() {
    if (!selectedPrinter || !query.trim()) return;
    setSearched(true);
    startTransition(async () => { const data = await searchSpareParts(selectedPrinterName, query.trim(), fuzzy); setResults(data); });
  }
  return (
    <div>
      <div className="metal-panel-deep" style={{ padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}><div className="led-dot led-blue" /><span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent-blue)' }}>Catalogo Ricambi</span></div>
        <div className="select-wrapper" style={{ marginBottom: 12 }}><select className="skeuo-select" value={selectedPrinter} onChange={e => { setSelectedPrinter(e.target.value); setResults([]); setSearched(false); }}><option value="">— Scegli stampante —</option>{printers.map(p => <option key={p.id} value={p.id}>{p.model_name}</option>)}</select></div>
        <input className="skeuo-input" type="text" placeholder="Nome o codice parte…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') doSearch(); }} disabled={!selectedPrinter} style={{ marginBottom: 12 }} />
        <div className="row-between" style={{ marginBottom: 16 }}>
          <label className="row-center" style={{ cursor: 'pointer', userSelect: 'none' }}>
            <label className="toggle"><input type="checkbox" checked={fuzzy} onChange={e => setFuzzy(e.target.checked)} /><span className="toggle-slider" /></label>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', marginLeft: 8, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'Rajdhani, sans-serif' }}>Ricerca Fuzzy</span>
          </label>
          {cart.length > 0 && <span className="badge badge-orange">&#128722; {cart.length} art.</span>}
        </div>
        <button className="skeuo-btn skeuo-btn-cyan tech-btn-row" onClick={doSearch} disabled={!selectedPrinter || !query.trim() || isPending}>{isPending ? <span className="spinner" /> : <IconBox />}<span>{isPending ? 'Ricerca…' : 'Cerca Ricambi'}</span></button>
      </div>
      {searched && !isPending && results.length === 0 && <div className="empty-state"><div className="empty-icon">&#128230;</div><p>Nessun ricambio trovato</p></div>}
      {results.length > 0 && (<><div className="row-between" style={{ marginBottom: 12 }}><span className="section-title" style={{ marginBottom: 0 }}>{results.length} ricamb{results.length === 1 ? 'io' : 'i'}</span><span className="badge badge-blue">{selectedPrinterName}</span></div>{results.map((part, i) => <PartRow key={`${part.part_code}-${i}`} part={part} onAdd={onAddToCart} />)}</>)}
    </div>
  );
}

function ScanView({ onNavigateWithCode }: { onNavigateWithCode: (tab: Tab, code: string) => void }) {
  const [code, setCode] = useState('');
  return (
    <div>
      <div className="metal-panel-deep" style={{ padding: 24, textAlign: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 20 }}>
          <div className="led-dot led-green" />
          <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--accent-lcd)' }}>Scanner Barcode</span>
        </div>
        <div className="viewfinder" style={{ position: 'relative', maxWidth: 320, margin: '0 auto 20px' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 48, marginBottom: 8, opacity: 0.4 }}>&#128247;</div><p style={{ fontSize: 11, color: 'rgba(0,255,157,0.35)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1.2px', textTransform: 'uppercase' }}>Fotocamera non attiva</p></div>
          <div style={{ position: 'absolute', top: 12, left: 12, width: 24, height: 24, borderTop: '2px solid var(--accent-lcd)', borderLeft: '2px solid var(--accent-lcd)', borderRadius: '4px 0 0 0' }} />
          <div style={{ position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderTop: '2px solid var(--accent-lcd)', borderRight: '2px solid var(--accent-lcd)', borderRadius: '0 4px 0 0' }} />
          <div style={{ position: 'absolute', bottom: 12, left: 12, width: 24, height: 24, borderBottom: '2px solid var(--accent-lcd)', borderLeft: '2px solid var(--accent-lcd)', borderRadius: '0 0 0 4px' }} />
          <div style={{ position: 'absolute', bottom: 12, right: 12, width: 24, height: 24, borderBottom: '2px solid var(--accent-lcd)', borderRight: '2px solid var(--accent-lcd)', borderRadius: '0 0 4px 0' }} />
        </div>
        <button className="skeuo-btn skeuo-btn-orange tech-btn-row" style={{ maxWidth: 320, margin: '0 auto' }} onClick={() => window.location.href = '/scan'}><IconBarcode /><span>Apri Scanner Fotocamera</span></button>
      </div>
      <div className="metal-panel" style={{ padding: 20 }}>
        <p className="section-title" style={{ marginBottom: 10 }}>Inserimento Manuale Codice</p>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14 }}>Oppure digita il codice direttamente:</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <input className="skeuo-input" type="text" placeholder="Es: C-240" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && code.trim()) onNavigateWithCode('errors', code.trim()); }} style={{ flex: 1 }} />
          <button className="skeuo-btn skeuo-btn-blue" style={{ padding: '14px 18px', flexDirection: 'row' }} onClick={() => { if (code.trim()) onNavigateWithCode('errors', code.trim()); }}><IconSearch /></button>
        </div>
      </div>
    </div>
  );
}

function CartDrawer({ cart, onClose, onRemove }: { cart: ManualSparePart[]; onClose: () => void; onRemove: (i: number) => void }) {
  const makeCartText = () => cart.map(p => `${p.part_code} | ${p.name}`).join('\n');
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="row-between" style={{ marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.5px' }}>&#128722; Carrello</h2><span className="badge badge-orange">{cart.length} art.</span></div>
        {cart.length === 0 ? <div className="empty-state"><div className="empty-icon">&#128722;</div><p>Carrello vuoto</p></div> : (
          <>{cart.map((p, i) => (<div key={i} className="result-card" style={{ marginBottom: 8 }}><div className="row-between"><div><span className="badge badge-green mono" style={{ marginBottom: 4, display: 'inline-block' }}>{p.part_code}</span><p style={{ fontSize: 12, color: 'var(--text-primary)' }}>{p.name}</p></div><button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: 4 }}>×</button></div></div>))}
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}><button className="icon-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => copyText(makeCartText())}><IconCopy /> Copia Lista</button><button className="icon-btn" style={{ flex: 1, justifyContent: 'center' }} onClick={() => window.print()}><IconPrint /> Stampa</button></div></>
        )}
      </div>
    </div>
  );
}

function FavoritesDrawer({ favorites, onClose, onRemove }: { favorites: FavItem[]; onClose: () => void; onRemove: (id: string) => void }) {
  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle" />
        <div className="row-between" style={{ marginBottom: 20 }}><h2 style={{ fontSize: 18, fontWeight: 700, fontFamily: 'Rajdhani, sans-serif', letterSpacing: '0.5px' }}>&#11088; Preferiti</h2><span className="badge badge-orange">{favorites.length}</span></div>
        {favorites.length === 0 ? <div className="empty-state"><div className="empty-icon">&#11088;</div><p>Nessun preferito</p></div> :
          favorites.map(f => (<div key={f.id} className="result-card" style={{ marginBottom: 8 }}><div className="row-between"><div><span className="error-code-big" style={{ fontSize: 16 }}>{f.code}</span><p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{f.printer}</p></div><button onClick={() => onRemove(f.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 20, padding: 4 }}>×</button></div></div>))
        }
      </div>
    </div>
  );
}

export default function AppTecnico() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [printers, setPrinters] = useState<Printer[]>([]);
  const [loadingPrinters, setLoadingPrinters] = useState(true);
  const [favorites, setFavorites] = useState<FavItem[]>([]);
  const [cart, setCart] = useState<ManualSparePart[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showFavs, setShowFavs] = useState(false);

  useEffect(() => { (async () => { try { const data = await getPrinters(); setPrinters(data); } finally { setLoadingPrinters(false); } })(); }, []);
  useEffect(() => { try { const saved = localStorage.getItem('apptecnico_favorites'); if (saved) setFavorites(JSON.parse(saved)); } catch { } }, []);

  function toggleFav(error: ErrorCode, printerName: string) {
    setFavorites(prev => {
      const exists = prev.find(f => f.id === error.id);
      const next = exists ? prev.filter(f => f.id !== error.id) : [...prev, { id: error.id, code: error.code, description: (error.cause as string) ?? '', printer: printerName }];
      localStorage.setItem('apptecnico_favorites', JSON.stringify(next));
      return next;
    });
  }

  function addToCart(part: ManualSparePart) { setCart(prev => [...prev, part]); }
  function removeFromCart(index: number) { setCart(prev => prev.filter((_, i) => i !== index)); }
  function removeFav(id: string) { setFavorites(prev => { const next = prev.filter(f => f.id !== id); localStorage.setItem('apptecnico_favorites', JSON.stringify(next)); return next; }); }
  function navigateWithCode(_tab: Tab, _code: string) { setActiveTab('errors'); }

  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'home',   label: 'Home',    icon: <IconHome /> },
    { id: 'errors', label: 'Errori',  icon: <IconSearch /> },
    { id: 'parts',  label: 'Ricambi', icon: <IconBox /> },
    { id: 'scan',   label: 'Scanner', icon: <IconScan /> },
  ];

  return (
    <>
      <header className="app-header">
        <div className="app-logo">
          <div className="app-logo-icon">&#128424;&#65039;</div>
          <div><div className="app-logo-text">AppTecnico</div><span className="app-logo-sub">Assistenza Stampanti</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="header-btn" onClick={() => setShowFavs(true)} aria-label="Preferiti" style={{ position: 'relative' }}>
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
            {favorites.length > 0 && <span className="fav-count">{favorites.length}</span>}
          </button>
          <button className="header-btn" onClick={() => setShowCart(true)} aria-label="Carrello" style={{ position: 'relative' }}>
            <IconCart />{cart.length > 0 && <span className="fav-count">{cart.length}</span>}
          </button>
        </div>
      </header>

      <div className="main-content desktop-tabs" style={{ paddingBottom: 0, display: 'none' }} id="desktop-tabs">
        <div className="tabs">{navItems.map(item => <button key={item.id} className={`tab-btn ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>{item.label}</button>)}</div>
      </div>

      <main className="main-content">
        {loadingPrinters && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60, gap: 14, alignItems: 'center', color: 'var(--accent-lcd)', fontFamily: 'Rajdhani, sans-serif', letterSpacing: '1px', fontSize: 13, textTransform: 'uppercase' }}>
            <span className="spinner" /> Caricamento…
          </div>
        )}
        {!loadingPrinters && (
          <>
            {activeTab === 'home'   && <HomeView printers={printers} favorites={favorites} cart={cart} onToggleFav={toggleFav} onAddToCart={addToCart} onNavigateWithCode={navigateWithCode} />}
            {activeTab === 'errors' && <ErrorsView printers={printers} favorites={favorites} onToggleFav={toggleFav} />}
            {activeTab === 'parts'  && <PartsView printers={printers} cart={cart} onAddToCart={addToCart} />}
            {activeTab === 'scan'   && <ScanView onNavigateWithCode={navigateWithCode} />}
          </>
        )}
      </main>

      <nav className="bottom-nav">
        {navItems.map(item => (
          <button key={item.id} className={`nav-item ${activeTab === item.id ? 'active' : ''}`} onClick={() => setActiveTab(item.id)}>
            <span className="nav-icon">{item.icon}</span><span>{item.label}</span>
          </button>
        ))}
      </nav>

      {showCart && <CartDrawer cart={cart} onClose={() => setShowCart(false)} onRemove={removeFromCart} />}
      {showFavs && <FavoritesDrawer favorites={favorites} onClose={() => setShowFavs(false)} onRemove={removeFav} />}

      <style>{`
        @media (min-width: 768px) { #desktop-tabs { display: block !important; } .bottom-nav { display: none !important; } }
        .metal-panel-deep { background: linear-gradient(160deg, #1a1f28 0%, #151920 50%, #12161d 100%); border: 1px solid rgba(255,255,255,0.08); border-top-color: rgba(255,255,255,0.14); border-bottom-color: rgba(0,0,0,0.70); border-radius: 16px; box-shadow: var(--shadow-deep-raised); position: relative; overflow: hidden; }
        .metal-panel { background: linear-gradient(145deg, #252c38 0%, #1e242e 25%, #1a1f28 50%, #1c2130 75%, #1a1e26 100%); border: 1px solid rgba(255,255,255,0.10); border-top-color: rgba(255,255,255,0.18); border-right-color: rgba(0,0,0,0.40); border-bottom-color: rgba(0,0,0,0.60); border-radius: 16px; box-shadow: var(--shadow-panel); position: relative; overflow: hidden; }
      `}</style>
    </>
  );
}
