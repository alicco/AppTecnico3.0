'use server';

import { normalizeCodeSync } from '../utils/normalize';

const API_URL = process.env.NEXT_PUBLIC_API_URL
    ? `${process.env.NEXT_PUBLIC_API_URL}/api`
    : (process.env.API_URL || 'http://127.0.0.1:8000/api');

// ─── PRINTERS ────────────────────────────────────────────────────────────────
export interface Printer { id: string; model_name: string; }

export async function getPrinters(): Promise<Printer[]> {
    try {
        const res = await fetch(`${API_URL}/printers`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as Printer[];
    } catch { return []; }
}

// ─── ERROR CODES ─────────────────────────────────────────────────────────────
export interface ErrorCode {
    id: string;
    code: string;
    classification?: string;
    cause?: string;
    measures?: string;
    solution?: string;
    estimated_abnormal_parts?: string;
    correction?: string;
    faulty_part_isolation?: string;
    note?: string;
    [key: string]: unknown;
}

export interface ErrorResult extends ErrorCode {
    model_name: string;
}

/** Search errors for a single model */
export async function searchErrors(
    modelName: string,
    codeQuery: string,
    exact = false,
): Promise<ErrorCode[]> {
    try {
        const trimmed = (codeQuery || '').trim();
        const params = new URLSearchParams({ model: modelName });
        const normalized = normalizeCodeSync(trimmed);
        if (trimmed) params.append('code', normalized);
        const res = await fetch(`${API_URL}/errors?${params}`, { cache: 'no-store' });
        if (!res.ok) return [];
        const data = (await res.json()) as ErrorCode[];

        if (exact && trimmed) {
            return data.filter(e => normalizeCodeSync(e.code) === normalized);
        }
        return data;
    } catch { return []; }
}

/**
 * Search errors across ALL models in parallel for suggestions.
 */
export async function searchErrorsAllModels(
    query: string,
    printers: Printer[],
    limit = 5,
): Promise<ErrorResult[]> {
    if (!query.trim() || printers.length === 0) return [];
    const normalized = normalizeCodeSync(query);

    const results = await Promise.all(
        printers.slice(0, 15).map(async (p) => {
            try {
                const params = new URLSearchParams({ model: p.model_name, code: normalized, limit: String(limit) });
                const res = await fetch(`${API_URL}/errors?${params}`, { cache: 'no-store' });
                if (!res.ok) return [];
                const data = (await res.json()) as ErrorCode[];
                return data.map(e => ({ ...e, model_name: p.model_name }));
            } catch { return []; }
        })
    );

    const seen = new Set<string>();
    const flat: ErrorResult[] = [];
    for (const group of results) {
        for (const e of group) {
            const key = `${e.model_name}::${e.code}`;
            if (!seen.has(key)) { seen.add(key); flat.push(e as ErrorResult); }
        }
    }
    return flat.slice(0, 40);
}

/** Get sections list for a model */
export async function getModelSections(modelName: string): Promise<string[]> {
    try {
        const res = await fetch(`${API_URL}/sections?model=${modelName}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as string[];
    } catch { return []; }
}

// ─── DIP SWITCHES ────────────────────────────────────────────────────────────
export interface DipSwitch {
    id: string; model_name: string;
    switch_number: number; bit_number: number;
    function_name: string; setting_0: string; setting_1: string; default_val: string;
}

export async function getDipSwitches(modelName: string): Promise<DipSwitch[]> {
    try {
        const res = await fetch(`${API_URL}/dipswitches?model=${modelName}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as DipSwitch[];
    } catch { return []; }
}

// ─── SPARE PARTS ─────────────────────────────────────────────────────────────
export interface ManualSparePart {
    model: string;
    section_name: string;
    page_number: string;
    ref_number: string;
    part_code: string;
    name: string;
    quantity: string;
    similarity?: number;
}

/** Search spare parts by part_code across ALL models */
export async function searchPartsByCode(
    code: string,
    limit = 100,
): Promise<ManualSparePart[]> {
    try {
        const params = new URLSearchParams({ q: code.trim().toUpperCase(), limit: String(limit) });
        const res = await fetch(`${API_URL}/parts?${params}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as ManualSparePart[];
    } catch { return []; }
}

/** Search spare parts for a specific model + section */
export async function searchSpareParts(
    modelName: string,
    query: string,
    section?: string,
): Promise<ManualSparePart[]> {
    try {
        const params = new URLSearchParams({ model: modelName, q: query });
        if (section) params.append('section', section);
        const res = await fetch(`${API_URL}/parts?${params}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as ManualSparePart[];
    } catch { return []; }
}
