export function normalizeIC(value) {
    return (value || '').toString().replace(/[^\d]/g, '');
}

export function isNonEmpty(value) {
    return Boolean((value || '').toString().trim());
}

export function normalizeName(value) {
    return (value || '').toString().trim().toLowerCase();
}
