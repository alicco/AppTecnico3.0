'use server';

import { supabase } from '@/lib/supabase';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';

export interface Printer {
    id: string;
    model_name: string;
}

export async function getPrinters(): Promise<Printer[]> {
    try {
        const res = await fetch(`${API_URL}/printers`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as Printer[];
    } catch (e) {
        console.error('Fetch printers failed', e);
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
        const params = new URLSearchParams({ model: modelName });
        if (trimmedQuery) params.append('code', trimmedQuery);
        // Note: Backend might not support 'exact' yet, so we filter locally too to be safe.
        // if (exact) params.append('exact', 'true'); 

        const res = await fetch(`${API_URL}/errors?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return [];

        const data = (await res.json()) as ErrorCode[];

        if (exact && trimmedQuery) {
            // Precise Local Filtering
            const isNumericQuery = /^\d+$/.test(trimmedQuery);

            if (isNumericQuery) {
                // If query is just numbers (e.g. "202"), match any code effectively equal to those numbers
                // "C-0202" -> "0202" != "202". We need to be careful.
                // Usually "202" should match "C-0202". 
                // Let's strip non-digits.
                const cleanQuery = trimmedQuery.replace(/\D/g, '');
                return data.filter(item => {
                    const cleanCode = item.code.replace(/\D/g, '');
                    // Check for exact equality OR if the code ends with the query (suffix match often desired for error codes)
                    // But explicitly requested "exact match". 
                    // Let's assume strict equality of numeric parts for now as "Exact".
                    return cleanCode === cleanQuery || Number(cleanCode) === Number(cleanQuery);
                });
            } else {
                // Alphanumeric exact match (e.g. "C-240")
                const cleanQuery = trimmedQuery.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
                return data.filter(item => {
                    const cleanCode = item.code.replace(/[^0-9a-zA-Z]/g, '').toUpperCase();
                    return cleanCode === cleanQuery;
                });
            }
        }

        return data;
    } catch (e) {
        console.error('Search failed', e);
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
        const params = new URLSearchParams({
            model: modelName,
            summary: '1'
        });

        const res = await fetch(`${API_URL}/errors?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error('Fetch all codes failed', e);
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
        const params = new URLSearchParams({ model: modelName });
        const res = await fetch(`${API_URL}/dipswitches?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as DipSwitch[];
    } catch (e) {
        console.error('Fetch dipswitches failed', e);
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

export async function searchSpareParts(modelName: string, query: string, fuzzy: boolean = false) {
    try {
        const params = new URLSearchParams({
            model: modelName,
            q: query,
            fuzzy: fuzzy.toString()
        });
        const res = await fetch(`${API_URL}/parts?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return (await res.json()) as ManualSparePart[];
    } catch (e) {
        console.error('Fetch parts failed', e);
        return [];
    }
}

// --- AI-powered Smart Search via Ollama (Qwen 3.5) ---

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:4b';

const SMART_SEARCH_SYSTEM_PROMPT = `Extract printer model and English part keywords from the query. ALWAYS translate Italian to English. Use: corona=charging unit, tamburo=drum, fusore=fuser, cinghia=belt, rullo=roller, sviluppatore=developer, pulizia=cleaning, lama=blade, sensore=sensor, ventola=fan, scheda=board, alimentatore=feeder, cassetto=tray, motore=motor, ingranaggio=gear, molla=spring, guida=guide, cavo=cable, connettore=connector, pannello=panel, sportello=cover, vetro=glass, cuscinetto=bearing, colore=color. Output JSON only.`;

// Fallback dictionary: if AI returns Italian keywords, translate them
const IT_TO_EN: Record<string, string[]> = {
    'corona': ['charging', 'corona'],
    'tamburo': ['drum', 'OPC'],
    'fusore': ['fuser', 'fusing'],
    'cinghia': ['belt', 'transfer belt'],
    'rullo': ['roller'],
    'sviluppatore': ['developer', 'developing'],
    'pulizia': ['cleaning'],
    'lama': ['blade'],
    'sensore': ['sensor'],
    'ventola': ['fan'],
    'scheda': ['board', 'PCB'],
    'alimentatore': ['feeder'],
    'cassetto': ['tray'],
    'motore': ['motor'],
    'ingranaggio': ['gear'],
    'molla': ['spring'],
    'guida': ['guide'],
    'cavo': ['cable'],
    'connettore': ['connector'],
    'pannello': ['panel'],
    'sportello': ['cover', 'door'],
    'vetro': ['glass'],
    'cuscinetto': ['bearing'],
    'colore': ['color'],
    'nero': ['black', 'K'],
    'trasferimento': ['transfer'],
    'pressione': ['pressure'],
    'separazione': ['separation'],
    'uscita': ['exit'],
    'ingresso': ['entrance', 'feed'],
    'carta': ['paper'],
    'toner': ['toner'],
};

function translateKeywords(keywords: string[]): string[] {
    const translated: string[] = [];
    for (const kw of keywords) {
        const lower = kw.toLowerCase();
        if (IT_TO_EN[lower]) {
            translated.push(...IT_TO_EN[lower]);
        } else {
            // Check if any Italian word is a substring of the keyword
            let found = false;
            for (const [it, en] of Object.entries(IT_TO_EN)) {
                if (lower.includes(it)) {
                    translated.push(...en);
                    found = true;
                    break;
                }
            }
            if (!found) {
                translated.push(kw);
            }
        }
    }
    return [...new Set(translated)];
}

interface SmartSearchResult {
    model: string;
    keywords: string[];
}

async function callOllama(query: string): Promise<SmartSearchResult | null> {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                messages: [
                    { role: 'system', content: SMART_SEARCH_SYSTEM_PROMPT },
                    { role: 'user', content: query }
                ],
                stream: false,
                think: false,
                format: {
                    type: 'object',
                    properties: {
                        model: { type: 'string' },
                        keywords: { type: 'array', items: { type: 'string' } }
                    },
                    required: ['model', 'keywords']
                },
                options: { num_predict: 150 }
            }),
            signal: AbortSignal.timeout(30000),
        });

        if (!res.ok) return null;
        const data = await res.json();
        const content = data?.message?.content;
        if (!content) return null;

        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        const rawKeywords: string[] = parsed.keywords || parsed.part_keywords || [];

        // Translate any Italian keywords that slipped through
        const keywords = translateKeywords(rawKeywords);

        return {
            model: parsed.model || parsed.printer_model || '',
            keywords,
        };
    } catch (e) {
        console.error('Ollama call failed', e);
        return null;
    }
}

export interface SmartSearchResponse {
    parts: ManualSparePart[];
    aiExtracted?: { model: string; keywords: string[] };
    fallback: boolean;
    message?: string;
}

export async function smartSearchParts(
    query: string,
    modelHint?: string,
): Promise<SmartSearchResponse> {
    // 1. Try AI extraction
    const ai = await callOllama(query);

    if (ai && ai.keywords.length > 0) {
        const model = ai.model || modelHint || '';

        // Search for each keyword, merge results
        const allResults: ManualSparePart[] = [];
        const seenCodes = new Set<string>();

        for (const kw of ai.keywords) {
            const results = await searchSpareParts(model, kw, false);
            for (const part of results) {
                const key = `${part.part_code}-${part.model}`;
                if (!seenCodes.has(key)) {
                    seenCodes.add(key);
                    allResults.push(part);
                }
            }
        }

        // If AI keywords found nothing, also try the original query terms
        if (allResults.length === 0) {
            const words = query.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 2);
            for (const w of words) {
                // Also translate individual words
                const translated = translateKeywords([w]);
                const searchTerms = [...new Set([w, ...translated])];
                for (const term of searchTerms) {
                    const results = await searchSpareParts(model, term, false);
                    for (const part of results) {
                        const key = `${part.part_code}-${part.model}`;
                        if (!seenCodes.has(key)) {
                            seenCodes.add(key);
                            allResults.push(part);
                        }
                    }
                }
            }
        }

        // If still nothing, try without model filter
        if (allResults.length === 0 && model) {
            for (const kw of ai.keywords) {
                const results = await searchSpareParts('', kw, false);
                for (const part of results) {
                    const key = `${part.part_code}-${part.model}`;
                    if (!seenCodes.has(key)) {
                        seenCodes.add(key);
                        allResults.push(part);
                    }
                }
                if (allResults.length > 0) break; // found some, stop
            }
            if (allResults.length > 0) {
                return {
                    parts: allResults.slice(0, 50),
                    aiExtracted: { model: ai.model, keywords: ai.keywords },
                    fallback: false,
                    message: `Nessun risultato per "${model}". Mostro risultati da altri modelli.`,
                };
            }
        }

        // Build message for 0 results
        if (allResults.length === 0) {
            return {
                parts: [],
                aiExtracted: { model: ai.model, keywords: ai.keywords },
                fallback: false,
                message: `Nessuna parte trovata per le keyword "${ai.keywords.join(', ')}"${model ? ` nel modello ${model}` : ''}. Prova con termini diversi o disattiva la ricerca AI.`,
            };
        }

        return {
            parts: allResults,
            aiExtracted: { model: ai.model, keywords: ai.keywords },
            fallback: false,
        };
    }

    // 2. Fallback: direct search with original query
    const model = modelHint || '';
    const parts = await searchSpareParts(model, query, false);
    return { parts, fallback: true };
}
