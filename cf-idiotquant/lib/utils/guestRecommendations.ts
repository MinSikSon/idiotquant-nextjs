const num = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
};

export function selectGuestRecommendations<T extends { ncav_ratio?: unknown; pbr?: unknown; per?: unknown }>(list: T[], limit = 10): T[] {
    return list
        .filter(item => num(item.ncav_ratio) >= 1 && num(item.pbr) > 0 && num(item.pbr) < 1 && num(item.per) > 0)
        .sort((a, b) => num(b.ncav_ratio) - num(a.ncav_ratio))
        .slice(0, limit);
}
