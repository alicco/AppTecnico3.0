'use server';

import { supabase } from '@/lib/supabase';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8000/api';

export async function getPrinters() {
    try {
        const res = await fetch(`${API_URL}/printers`, { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error('Fetch printers failed', e);
        return [];
    }
}

export async function searchErrors(modelName: string, codeQuery: string) {
    try {
        const params = new URLSearchParams({ model: modelName });
        if (codeQuery) params.append('code', codeQuery);

        const res = await fetch(`${API_URL}/errors?${params.toString()}`, { cache: 'no-store' });
        if (!res.ok) return [];
        return await res.json();
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
