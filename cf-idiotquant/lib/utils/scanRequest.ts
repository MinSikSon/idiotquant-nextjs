export type ScanDailyRequest = string | {
    date?: string;
    weeklyPeriod?: string | null;
    limit?: number;
    country?: "KR" | "US";
    preview?: boolean;
    force?: boolean;
} | undefined;

export function scanRequestKey(arg: ScanDailyRequest): string {
    const options = typeof arg === "object" ? arg : {};
    const country = options.country ?? "KR";
    if (options.weeklyPeriod) return JSON.stringify(["weekly", country, options.weeklyPeriod]);
    const date = typeof arg === "string" ? arg : options.date ?? "latest";
    return JSON.stringify(["daily", country, date, options.preview ? "per20" : options.limit ?? 2500]);
}

export function shouldFetchScan(state: {
    requestKey: string | null;
    requestId: string | null;
    receivedAt: number | null;
    state: string;
}, arg: ScanDailyRequest, now = Date.now()): boolean {
    const same = state.requestKey === scanRequestKey(arg);
    if (same && state.requestId) return false;
    if (typeof arg === "object" && arg?.force) return true;
    return !same || state.state !== "fulfilled" || state.receivedAt === null || now - state.receivedAt >= 30_000;
}
