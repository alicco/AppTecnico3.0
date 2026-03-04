'use server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ? `${process.env.NEXT_PUBLIC_API_URL}/api` : (process.env.API_URL || 'http://127.0.0.1:8000/api');

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
