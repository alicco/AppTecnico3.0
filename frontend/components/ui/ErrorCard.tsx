'use client';

import { useState, ReactElement } from 'react';
import { SparePartsSearch } from './SparePartsSearch';
import { PsChip } from './SensorChip';

interface SparePart {
  oem_code: string;
  description: string;
  ranking: number;
  image_url?: string;
  [key: string]: unknown;
}

interface ErrorProps {
  error: {
    code: string;
    classification?: string;
    cause?: string;
    measures?: string;
    solution?: string;
    estimated_abnormal_parts?: string;
    correction?: string;
    faulty_part_isolation?: string;
    note?: string;
    parts?: SparePart[];
  };
  onDipSwitchClick?: (sw: number, bit: number) => void;
  model?: string;
}

// ─── Accordion ────────────────────────────────────────────────────────────────

interface AccordionProps {
  label: string;
  icon: ReactElement;
  iconColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Accordion({ label, icon, iconColor, defaultOpen = false, children }: AccordionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      style={{
        border: '1px solid var(--border-subtle)',
        borderRadius: 10,
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        className="accordion-header"
        onClick={() => setOpen((o) => !o)}
        style={{ borderRadius: 0 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: iconColor, display: 'flex', alignItems: 'center' }}>{icon}</span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-secondary)',
            }}
          >
            {label}
          </span>
        </div>
        <svg
          style={{
            width: 14,
            height: 14,
            color: 'var(--text-muted)',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
            flexShrink: 0,
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div
          className="animate-fade-in"
          style={{ padding: '10px 14px 14px', background: 'var(--bg-elevated)' }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Icons (inline SVGs) ───────────────────────────────────────────────────────

const IcoWarning = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="m10.29 3.86-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.71-3.14l-8-14a2 2 0 0 0-3.42 0z" />
    <path d="M12 9v4M12 17h.01" />
  </svg>
);

const IcoInfo = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 16v-4M12 8h.01" />
  </svg>
);

const IcoCheck = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <path d="m9 11 3 3L22 4" />
  </svg>
);

const IcoBuild = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
);

const IcoSettings = (
  <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

// ─── Linked text helpers ───────────────────────────────────────────────────────

function renderLinkedText(
  text: string | undefined,
  onDipSwitchClick?: (sw: number, bit: number) => void,
  preWrap = false,
  model?: string,
): React.ReactNode {
  if (!text) return null;

  // Combined regex: DipSW references OR PS references
  const combinedRegex = /(?:((?:DipSW|SW)\s*\d+-\d+)|(PS-?\d{1,3}))/gi;
  const matches = [...text.matchAll(combinedRegex)];
  if (!matches.length) {
    return preWrap ? <span style={{ whiteSpace: 'pre-wrap' }}>{text}</span> : text;
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const match of matches) {
    const [full, dipswFull, psFull] = match;
    const idx = match.index!;
    if (idx > cursor) {
      parts.push(
        <span key={`t-${idx}`} style={preWrap ? { whiteSpace: 'pre-wrap' } : {}}>
          {text.slice(cursor, idx)}
        </span>,
      );
    }

    if (dipswFull) {
      const dipswMatch = dipswFull.match(/(\d+)-(\d+)/);
      if (dipswMatch) {
        parts.push(
          <button
            key={`d-${idx}`}
            type="button"
            className="chip chip-blue"
            style={{ verticalAlign: 'middle', cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onDipSwitchClick?.(parseInt(dipswMatch[1]), parseInt(dipswMatch[2]));
            }}
          >
            {IcoSettings}
            {dipswFull}
          </button>,
        );
      }
    } else if (psFull && model) {
      parts.push(
        <PsChip key={`ps-${idx}`} label={psFull} model={model} />,
      );
    } else {
      parts.push(<span key={`r-${idx}`}>{full}</span>);
    }

    cursor = idx + full.length;
  }
  if (cursor < text.length) {
    parts.push(
      <span key="t-end" style={preWrap ? { whiteSpace: 'pre-wrap' } : {}}>
        {text.slice(cursor)}
      </span>,
    );
  }
  return <>{parts}</>;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ErrorCard({ error, onDipSwitchClick, model }: ErrorProps) {
  const [partSearchOpen, setPartSearchOpen] = useState(false);
  const [partQuery, setPartQuery] = useState('');

  const handlePartClick = (query: string) => {
    if (!model) return;
    setPartQuery(query);
    setPartSearchOpen(true);
  };

  // Parse solution into numbered steps
  const renderSolution = () => {
    if (!error.solution) return null;
    const text = error.solution;
    const hasNumbering = /\d+\./.test(text);
    if (hasNumbering) {
      const steps = text
        .split(/(?=\b\d+\.\s)/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
      return (
        <ol style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {steps.map((step, idx) => {
            const m = step.match(/^(\d+\.)\s+([\s\S]*)/);
            if (m) {
              return (
                <li key={idx} style={{ display: 'flex', gap: 8 }}>
                  <span
                    className="mono"
                    style={{ color: 'var(--accent)', fontWeight: 700, minWidth: 22, flexShrink: 0, fontSize: '0.85rem' }}
                  >
                    {m[1]}
                  </span>
                  <span style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
                    {renderLinkedText(m[2], onDipSwitchClick, false, model)}
                  </span>
                </li>
              );
            }
            return (
              <li key={idx} style={{ paddingLeft: 22, fontSize: '0.88rem', lineHeight: 1.55 }}>
                {renderLinkedText(step, onDipSwitchClick, false, model)}
              </li>
            );
          })}
        </ol>
      );
    }
    // Line-by-line
    return (
      <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {text.split('\n').map((line, idx) => {
          const trimmed = line.trim();
          if (!trimmed) return null;
          return (
            <li key={idx} style={{ fontSize: '0.88rem', lineHeight: 1.55 }}>
              {renderLinkedText(trimmed, onDipSwitchClick, false, model)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      <div
        className="animate-fade-up"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-default)',
          borderRadius: 14,
          overflow: 'hidden',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-strong)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border-default)';
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        {/* ── Card Header ─────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'linear-gradient(90deg, rgba(56,189,248,0.05) 0%, transparent 60%)',
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
            }}
          >
            {error.code}
          </span>
          {error.classification && (
            <span
              className="chip chip-blue"
              style={{ fontSize: '0.75rem', padding: '4px 10px', borderRadius: 6 }}
            >
              {error.classification}
            </span>
          )}
        </div>

        {/* ── Accordions ──────────────────────────────────────────── */}
        <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>

          {error.cause && (
            <Accordion label="Cause" icon={IcoWarning} iconColor="var(--amber)" defaultOpen>
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                {renderLinkedText(error.cause, onDipSwitchClick, false, model)}
              </p>
            </Accordion>
          )}

          {error.measures && (
            <Accordion label="Measures" icon={IcoInfo} iconColor="var(--accent)">
              <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                {renderLinkedText(error.measures, onDipSwitchClick, true, model)}
              </p>
            </Accordion>
          )}

          {error.solution && (
            <Accordion label="Solution" icon={IcoCheck} iconColor="var(--green)" defaultOpen>
              {renderSolution()}
            </Accordion>
          )}

          {error.correction && (
            <Accordion
              label="Correction"
              icon={error.correction.toLowerCase().includes('warning') ? IcoWarning : IcoCheck}
              iconColor={error.correction.toLowerCase().includes('warning') ? 'var(--red)' : 'var(--text-secondary)'}
            >
              {error.correction.toLowerCase().includes('warning') ? (
                <div
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(248,113,113,0.07)',
                    border: '1px solid rgba(248,113,113,0.25)',
                    borderRadius: 8,
                    fontSize: '0.88rem',
                    color: 'var(--red)',
                    lineHeight: 1.6,
                  }}
                >
                  ⚠️ {renderLinkedText(error.correction, onDipSwitchClick, true, model)}
                </div>
              ) : (
                <p style={{ fontSize: '0.88rem', lineHeight: 1.6, margin: 0 }}>
                  {renderLinkedText(error.correction, onDipSwitchClick, true, model)}
                </p>
              )}
            </Accordion>
          )}

          {error.faulty_part_isolation && (
            <Accordion label="Fault Isolation" icon={IcoWarning} iconColor="var(--amber)">
              <div
                style={{
                  padding: '10px 12px',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 8,
                  fontSize: '0.83rem',
                  lineHeight: 1.6,
                }}
              >
                {renderLinkedText(error.faulty_part_isolation, onDipSwitchClick, true, model)}
              </div>
            </Accordion>
          )}

          {(error.estimated_abnormal_parts || (error.parts && error.parts.length > 0)) && (
            <Accordion label="Recommended Spare Parts" icon={IcoBuild} iconColor="var(--text-secondary)" defaultOpen>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {error.estimated_abnormal_parts && (() => {
                  const partsList = error.estimated_abnormal_parts!
                    .split(/\s*[•]\s*|\s*\|\s*/)
                    .map((p) => p.trim())
                    .filter((p) => p.length > 0);
                  return (
                    <div>
                      <div
                        style={{
                          fontSize: '0.67rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 8,
                        }}
                      >
                        Parti stimate difettose — clicca per cercare
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {partsList.map((part, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handlePartClick(part)}
                            style={{
                              padding: '4px 12px',
                              borderRadius: 999,
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              background: 'rgba(34,197,94,0.12)',
                              border: '1px solid rgba(34,197,94,0.4)',
                              color: '#4ade80',
                              cursor: 'pointer',
                              transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                              lineHeight: 1.5,
                              textAlign: 'left',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                            }}
                            onMouseEnter={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.background = 'rgba(34,197,94,0.25)';
                              el.style.borderColor = 'rgba(34,197,94,0.7)';
                              el.style.color = '#86efac';
                            }}
                            onMouseLeave={(e) => {
                              const el = e.currentTarget as HTMLButtonElement;
                              el.style.background = 'rgba(34,197,94,0.12)';
                              el.style.borderColor = 'rgba(34,197,94,0.4)';
                              el.style.color = '#4ade80';
                            }}
                          >
                            <span style={{ fontSize: '0.65rem', opacity: 0.8 }}>+</span>
                            {part}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {error.parts && error.parts.length > 0 && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 8,
                    }}
                  >
                    {error.parts.map((part, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          gap: 10,
                          padding: '10px 12px',
                          background: 'var(--bg-elevated)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 10,
                          alignItems: 'center',
                        }}
                      >
                        {part.image_url && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={part.image_url}
                            alt={part.oem_code}
                            style={{ width: 52, height: 52, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }}
                          />
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div
                            className="mono"
                            style={{ color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem', marginBottom: 2 }}
                          >
                            {part.oem_code}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 6 }}>
                            {part.description}
                          </div>
                          {/* Ranking bars */}
                          <div style={{ display: 'flex', gap: 3 }}>
                            {[...Array(5)].map((_, i) => (
                              <div
                                key={i}
                                style={{
                                  width: 14,
                                  height: 3,
                                  borderRadius: 2,
                                  background: i < part.ranking ? 'var(--accent)' : 'var(--bg-hover)',
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Accordion>
          )}

        </div>
      </div>

      {/* Spare Parts modal */}
      {model && (
        <SparePartsSearch
          open={partSearchOpen}
          onClose={() => setPartSearchOpen(false)}
          initialQuery={partQuery}
          model={model}
        />
      )}
    </>
  );
}

