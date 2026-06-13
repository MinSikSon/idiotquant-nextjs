export const safeNum = (v: unknown): number => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};
