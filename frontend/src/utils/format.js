export function formatDecimal(value) {
    const num = parseFloat(value);
    if (Number.isFinite(num)) {
        return num % 1 === 0 ? num.toString() : num.toFixed(2);
    }
    return '0';
}

export function formatDate(date = new Date()) {
    return date.toLocaleDateString();
}
