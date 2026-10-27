// 재무상태표는 최신 공시, 연간 이익 기반 평가는 별도의 연간 자료를 사용한다.
export function latestFirst<T extends { endDate?: string; stac_yymm?: string; filedDate?: string }>(rows: T[] = []): T[] {
    return [...rows].sort((a, b) =>
        String(b.endDate ?? b.stac_yymm ?? '').localeCompare(String(a.endDate ?? a.stac_yymm ?? '')) ||
        String(b.filedDate ?? '').localeCompare(String(a.filedDate ?? '')));
}

export function annualKrIncomeRows<T extends { stac_yymm?: string }>(financial: { output?: T[]; annualOutput?: T[]; frequency?: string }): T[] {
    return latestFirst(financial?.annualOutput ?? (financial?.frequency === 'quarterly' ? [] : financial?.output));
}

export function annualUsReport<T extends { endDate?: string; filedDate?: string; form?: string }>(financial: { data?: T[]; annualData?: T[] }) {
    return latestFirst(financial?.annualData ?? financial?.data?.filter(row => !row.form || /^(10-K|20-F|40-F)(\/A)?$/.test(row.form)))[0];
}

export function usReportPeriodLabel(report: { endDate?: string; startDate?: string; form?: string; periodType?: string }): string {
    const end = String(report.endDate ?? '').slice(0, 10);
    if (!end) return '—';
    if (/^(10-K|20-F|40-F)(\/A)?$/.test(report.form ?? '') || report.periodType === 'annual') return `${end} · 연간`;
    const start = String(report.startDate ?? '').slice(0, 10);
    if (report.periodType === 'ytd' && start) return `${start} ~ ${end} · 누적`;
    return /^10-Q(\/A)?$/.test(report.form ?? '') ? `${end} · 분기 공시` : end;
}
