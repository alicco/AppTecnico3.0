'use server';

import { supabase } from '@/lib/supabase';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';

export interface Printer {
    id: string;
    model_name: string;
}

export async function getPrinters(): Promise<Printer[]> {
    try {
        const { data, error } = await supabase
            .from('printers')
            .select('id, model_name')
            .order('model_name');
        if (error) { console.error('getPrinters failed', error); return []; }
        return (data || []) as Printer[];
    } catch (e) {
        console.error('getPrinters failed', e);
        return [];
    }
}

export interface ErrorCode {
    id: string;
    code: string;
    cause?: string;
    [key: string]: unknown;
}

export async function searchErrors(modelName: string, codeQuery: string, exact: boolean = false) {
    try {
        const trimmedQuery = (codeQuery || '').trim();

        // Get printer_id from model_name
        const { data: printer, error: printerError } = await supabase
            .from('printers')
            .select('id')
            .eq('model_name', modelName)
            .single();
        if (printerError || !printer) return [];

        // Build query with smart code matching
        let query = supabase
            .from('error_codes')
            .select('id, code, classification, cause, measures, solution, estimated_abnormal_parts, correction, faulty_part_isolation, note')
            .eq('printer_id', printer.id);

        if (trimmedQuery) {
            const isNumeric = /^\d+$/.test(trimmedQuery);
            if (isNumeric) {
                // Numeric: match codes whose digit portion contains this sequence
                // e.g. "0001" → matches "C-0001"
                query = query.ilike('code', `%${trimmedQuery}%`);
            } else {
                // Alphanumeric: user typed "C0001", "C-0001", "C-00", etc.
                // Strip dashes/spaces → canonical form e.g. "C0001"
                const clean = trimmedQuery.replace(/[-\s]/g, '').toUpperCase();
                // Reconstruct with dash after leading letters: "C0001" → "C-0001"
                const withDash = clean.replace(/^([A-Z]+)(\d.*)$/, '$1-$2');
                // Try both forms: covers C0001, C-0001, C-0 prefix
                if (withDash !== clean) {
                    query = query.or(`code.ilike.${withDash}%,code.ilike.${clean}%`);
                } else {
                    query = query.ilike('code', `${clean}%`);
                }
            }
        }

        const limit = exact ? 50 : 20;
        const { data, error } = await query.order('code').limit(limit);
        if (error) { console.error('searchErrors failed', error); return []; }

        const results = (data || []) as ErrorCode[];

        // Exact mode: narrow down to precise match
        if (exact && trimmedQuery) {
            const isNumeric = /^\d+$/.test(trimmedQuery);
            if (isNumeric) {
                const cleanQuery = trimmedQuery.replace(/\D/g, '');
                const exact_match = results.filter(item => item.code.replace(/\D/g, '') === cleanQuery);
                return exact_match.length > 0 ? exact_match : results;
            } else {
                const cleanQuery = trimmedQuery.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
                const exact_match = results.filter(item =>
                    item.code.replace(/[^0-9a-zA-Z]/g, '').toUpperCase() === cleanQuery
                );
                return exact_match.length > 0 ? exact_match : results;
            }
        }

        return results;
    } catch (e) {
        console.error('searchErrors failed', e);
        return [];
    }
}

export async function getErrorDetails(id: string) {
    const { data, error } = await supabase
        .from('error_codes')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

export async function getAllModelCodes(modelName: string) {
    try {
        const { data: printer } = await supabase
            .from('printers')
            .select('id')
            .eq('model_name', modelName)
            .single();
        if (!printer) return [];

        const { data, error } = await supabase
            .from('error_codes')
            .select('id, code, classification')
            .eq('printer_id', printer.id)
            .order('code');
        if (error) return [];
        return data || [];
    } catch (e) {
        console.error('getAllModelCodes failed', e);
        return [];
    }
}

export interface DipSwitch {
    id: string;
    model_name: string;
    switch_number: number;
    bit_number: number;
    function_name: string;
    setting_0: string;
    setting_1: string;
    default_val: string;
}

export async function getDipSwitches(modelName: string) {
    try {
        const { data, error } = await supabase
            .from('dip_switches')
            .select('id, model_name, switch_number, bit_number, function_name, setting_0, setting_1, default_val')
            .eq('model_name', modelName)
            .order('switch_number')
            .order('bit_number');
        if (error) { console.error('getDipSwitches failed', error); return []; }
        return (data || []) as DipSwitch[];
    } catch (e) {
        console.error('getDipSwitches failed', e);
        return [];
    }
}

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

const MODEL_FAMILIES: Record<string, string[]> = {
    C4065: ['C4080', 'C4070'],
    C4070: ['C4080', 'C4065'],
    C4080: ['C4065', 'C4070'],
    C12000: ['C12010'],
    C12010: ['C12000'],
};

export async function searchSpareParts(modelName: string, query: string, _fuzzy: boolean = false): Promise<ManualSparePart[]> {
    const trimmed = query.trim();
    if (!trimmed || !modelName) return [];

    // Deduplicated merge of two arrays by part_code+model
    const merge = (a: ManualSparePart[], b: ManualSparePart[]) => {
        const seen = new Set(a.map((r) => r.part_code + r.model));
        return [...a, ...b.filter((r) => !seen.has(r.part_code + r.model))];
    };

    // Search by term: two separate ilike queries (name OR section_name) then merged
    const run = async (term: string): Promise<ManualSparePart[]> => {
        const pat = `%${term}%`;
        const base = () =>
            supabase
                .from('manual_spare_parts')
                .select('model, section_name, page_number, ref_number, part_code, name, quantity')
                .eq('model', modelName)
                .order('section_name')
                .limit(40);

        const [{ data: byName }, { data: bySection }] = await Promise.all([
            base().ilike('name', pat),
            base().ilike('section_name', pat),
        ]);
        return merge((byName || []) as ManualSparePart[], (bySection || []) as ManualSparePart[]);
    };

    // Same logic but without model filter — fallback across all models
    const runAll = async (term: string): Promise<ManualSparePart[]> => {
        const pat = `%${term}%`;
        const base = () =>
            supabase
                .from('manual_spare_parts')
                .select('model, section_name, page_number, ref_number, part_code, name, quantity')
                .order('section_name')
                .limit(40);

        const [{ data: byName }, { data: bySection }] = await Promise.all([
            base().ilike('name', pat),
            base().ilike('section_name', pat),
        ]);
        return merge((byName || []) as ManualSparePart[], (bySection || []) as ManualSparePart[]);
    };

    const search = async (runFn: (term: string) => Promise<ManualSparePart[]>): Promise<ManualSparePart[]> => {
        // 1. Acronym in parentheses: "(PRCB)" → "PRCB"
        const acronymMatch = trimmed.match(/\(([A-Z0-9]{2,8})\)/);
        if (acronymMatch) {
            const res = await runFn(acronymMatch[1]);
            if (res.length > 0) return res;
        }

        // 2. Full phrase
        const phraseRes = await runFn(trimmed);
        if (phraseRes.length > 0) return phraseRes;

        // 3. Keyword fallback
        const stopWords = new Set(['unit', 'the', 'and', 'for', 'board', 'assembly', 'assy',
            'with', 'from', 'supply', 'drive', 'section', 'part']);
        const words = trimmed
            .split(/[\s/\-()+0-9]+/)
            .map((w) => w.trim())
            .filter((w) => w.length > 3 && !stopWords.has(w.toLowerCase()))
            .sort((a, b) => b.length - a.length);

        for (const word of words.slice(0, 4)) {
            const res = await runFn(word);
            if (res.length > 0) return res;
        }

        return [];
    };

    try {
        // First: search with exact model
        const withModel = await search(run);
        if (withModel.length > 0) return withModel;

        // Fallback 1: try sibling models from the same family (e.g. C4065 → C4080)
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
                return merge((byName || []) as ManualSparePart[], (bySection || []) as ManualSparePart[]);
            };
            const res = await search(siblingRun);
            if (res.length > 0) return res.map((r) => ({ ...r, model: modelName }));
        }

        // Fallback 2: search across all models
        const acrossAll = await search(runAll);
        return acrossAll;
    } catch (e) {
        console.error('[searchSpareParts] ERROR:', e);
        return [];
    }
}

// --- Sensor lookup ---

export interface Sensor {
    id: string;
    model: string;
    part_id: string;
    part_code: string | null;
    description: string | null;
    section: string | null;
    key: number | null;
    page: number | null;
}

export async function getSensor(model: string, partId: string): Promise<Sensor | null> {
    // Model aliasing: C7090→C7100, C14000→C12000, C4065/C4070→C4080
    const aliasMap: Record<string, string> = {
        C7090: 'C7100', C14000: 'C12000',
        C4065: 'C4080', C4070: 'C4080',
    };
    const lookupModel = aliasMap[model] ?? model;
    const { data, error } = await supabase
        .from('sensors')
        .select('id, model, part_id, part_code, description, section, key, page')
        .eq('model', lookupModel)
        .eq('part_id', partId.toUpperCase())
        .single();
    if (error || !data) return null;
    return data as Sensor;
}

// --- Direct Supabase search (bypasses Rust backend) ---

export async function searchPartsDirectly(query: string): Promise<ManualSparePart[]> {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) return [];

    try {
        const upperQ = trimmed.toUpperCase();
        const { data, error } = await supabase
            .from('manual_spare_parts')
            .select('model, section_name, page_number, ref_number, part_code, name, quantity')
            .or(`part_code.ilike.${upperQ}*,name.ilike.*${trimmed}*`)
            .order('part_code')
            .limit(200);

        if (error) {
            console.error('Supabase search failed', error);
            return [];
        }
        return (data || []) as ManualSparePart[];
    } catch (e) {
        console.error('Search failed', e);
        return [];
    }
}
