'use server';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8080/api';

export async function importErrorCodes(formData: FormData) {
    try {
        console.log(`[Import] Sending request to ${API_URL}/import`);
        const res = await fetch(`${API_URL}/import`, {
            method: 'POST',
            body: formData,
            // Duplex needed for some node fetch implementations with streams, though usually optional for FormData
            // @ts-expect-error - duplex is not in standard RequestInit type yet
            duplex: 'half',
        });

        console.log(`[Import] Response status: ${res.status}`);

        const text = await res.text();
        console.log(`[Import] Response body preview: ${text.substring(0, 200)}`);

        try {
            return JSON.parse(text);
        } catch {
            console.error('[Import] Failed to parse JSON response');
            return { success: false, message: `Server returned non-JSON: ${res.status} ${res.statusText}` };
        }
    } catch (e) {
        console.error('[Import] Critical Fetch Error:', e);
        return { success: false, message: `Connection Error: ${(e as Error).message}` };
    }
}
