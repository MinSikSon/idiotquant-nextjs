/** KIS symbols include class/preferred shares such as BRK/B and AAC/UN. */
export function isUsTicker(value: string): boolean {
    return /^[A-Z][A-Z0-9]*(?:[./^\-][A-Z0-9]*)?$/.test(value) && value.length <= 14;
}

/** The cached directory powers suggestions; it must not block a new listing. */
export function resolveStockSearchInput(value: string, knownNames: readonly string[]): string | null {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const upper = trimmed.toUpperCase();
    const known = knownNames.find(name => name.toUpperCase() === upper);
    if (known) return known;
    // Accept common class/preferred aliases only when the broker symbol exists.
    const brokerSymbol = upper.replace(/[.^]/, '/');
    if (brokerSymbol !== upper && knownNames.includes(brokerSymbol)) return brokerSymbol;
    return isUsTicker(upper) || /^\d{6}$/.test(trimmed) ? upper : null;
}
