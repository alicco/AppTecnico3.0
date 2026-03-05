/** Normalize a user-typed code: strip separators → uppercase */
export function normalizeCodeSync(raw: string): string {
    return raw.replace(/[\s\-_.]/g, '').toUpperCase();
}
