export const FACTORS = [
    { key: 'pbr', label: 'PBR', lower: true },
    { key: 'per', label: 'PER', lower: true },
    { key: 'roe', label: 'ROE', lower: false },
    { key: 'ncav_ratio', label: 'NCAV 비율', lower: false },
    { key: 'momentum20', label: '20기간 모멘텀', lower: false },
    { key: 'momentum60', label: '60기간 모멘텀', lower: false },
] as const;
export type FactorKey = typeof FACTORS[number]['key'];
export type FactorRule = { key: FactorKey; weight: number; lower: boolean; min?: number; max?: number };
export type ResearchRow = { date: string; availableDate: string; ticker: string; name?: string; close: number } & Partial<Record<FactorKey, number>>;
export const DEFAULT_RULES: FactorRule[] = FACTORS.map(f => ({ key: f.key, weight: f.key === 'pbr' || f.key === 'roe' ? 1 : 0, lower: f.lower }));

export function scanResearchRows(items: Record<string, any>[], date: string): ResearchRow[] {
    const number = (value: unknown): number | undefined => {
        if (value == null || String(value).trim() === '') return undefined;
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
    };
    return items.map(item => {
        const close = number(item.last_price);
        if (close == null || close <= 0 || !item.ticker) throw new Error(`${item.ticker ?? '종목'}: 스냅샷 가격 또는 종목코드가 없습니다.`);
        const row: ResearchRow = { date, availableDate: date, ticker: item.ticker, name: item.name, close };
        for (const { key } of FACTORS) if (key !== 'roe') row[key] = number(item[key]);
        const eps = number(item.eps), bps = number(item.bps), roe = number(item.roe);
        // EPS/BPS 기준의 부호를 유지한다. 값이 없다는 사실을 ROE 0%로 바꾸지 않는다.
        row.roe = eps != null && bps != null && bps > 0 ? eps / bps * 100 : roe == null ? undefined : roe * 100;
        return row;
    });
}

export function rankFactors(rows: ResearchRow[], rules: FactorRule[]) {
    if (rules.some(r => !Number.isFinite(r.weight) || r.weight < 0 || r.weight > 100 || (r.min != null && !Number.isFinite(r.min)) || (r.max != null && !Number.isFinite(r.max)) || (r.min != null && r.max != null && r.min > r.max))) throw new Error('가중치와 지표 범위를 확인해 주세요.');
    const active = rules.filter(r => r.weight > 0 || r.min != null || r.max != null);
    const totalWeight = active.reduce((sum, r) => sum + r.weight, 0);
    if (totalWeight <= 0) throw new Error('팩터 가중치를 하나 이상 입력해 주세요.');
    const eligible = rows.filter(row => row.availableDate <= row.date && active.every(rule => {
        const value = row[rule.key];
        return value != null && Number.isFinite(value) && (!['pbr', 'per'].includes(rule.key) || value > 0)
            && (rule.min == null || value >= rule.min) && (rule.max == null || value <= rule.max);
    }));
    const scores = new Map(eligible.map(row => [row.ticker, 0]));
    for (const rule of active.filter(r => r.weight > 0)) {
        const sorted = [...eligible].sort((a, b) => rule.lower ? a[rule.key]! - b[rule.key]! : b[rule.key]! - a[rule.key]!);
        for (let i = 0; i < sorted.length;) {
            let end = i + 1;
            while (end < sorted.length && sorted[end][rule.key] === sorted[i][rule.key]) end++;
            const score = sorted.length === 1 ? 100 : (1 - (i + end - 1) / 2 / (sorted.length - 1)) * 100;
            for (let j = i; j < end; j++) scores.set(sorted[j].ticker, scores.get(sorted[j].ticker)! + score * rule.weight / totalWeight);
            i = end;
        }
    }
    return eligible.map(row => ({ ...row, score: scores.get(row.ticker)! })).sort((a, b) => b.score - a.score || a.ticker.localeCompare(b.ticker));
}

function validDate(value: string) {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

// Excel의 따옴표·쉼표·개행·BOM을 처리한다. 파일 내용은 서버로 전송하지 않는다.
export function parseResearchCsv(text: string): ResearchRow[] {
    const records: string[][] = []; let row: string[] = [], cell = '', quoted = false;
    text = text.replace(/^\uFEFF/, '');
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (ch === '"') {
            if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted;
        } else if (!quoted && (ch === ',' || ch === '\n' || ch === '\r')) {
            row.push(cell.trim()); cell = '';
            if (ch !== ',') {
                if (row.some(Boolean)) records.push(row);
                row = [];
                if (ch === '\r' && text[i + 1] === '\n') i++;
            }
        } else cell += ch;
        if (records.length > 50000) throw new Error('CSV는 50,000행 이하로 입력해 주세요.');
    }
    if (quoted) throw new Error('CSV의 따옴표가 닫히지 않았습니다.');
    row.push(cell.trim()); if (row.some(Boolean)) records.push(row);
    const headers = records.shift() ?? [];
    if (records.length > 50000) throw new Error('CSV는 50,000행 이하로 입력해 주세요.');
    for (const key of ['date', 'available_date', 'ticker', 'close']) if (!headers.includes(key)) throw new Error(`CSV에 ${key} 열이 필요합니다.`);
    if (new Set(headers).size !== headers.length) throw new Error('CSV 열 이름이 중복되어 있습니다.');
    const seen = new Set<string>();
    return records.map((record, index) => {
        if (record.length !== headers.length) throw new Error(`${index + 2}행의 열 수를 확인해 주세요.`);
        const data = Object.fromEntries(headers.map((key, i) => [key, record[i]]));
        const close = data.close === '' ? NaN : Number(data.close);
        if (!validDate(data.date) || !validDate(data.available_date) || !data.ticker || !Number.isFinite(close) || close < 0) throw new Error(`${index + 2}행의 날짜·종목·가격을 확인해 주세요.`);
        const id = `${data.date}:${data.ticker}`;
        if (seen.has(id)) throw new Error(`${index + 2}행의 날짜·종목이 중복되어 있습니다.`);
        seen.add(id);
        const result: ResearchRow = { date: data.date, availableDate: data.available_date, ticker: data.ticker, name: data.name, close };
        for (const { key } of FACTORS) {
            if (data[key] != null && data[key] !== '') {
                const number = Number(data[key]);
                if (!Number.isFinite(number)) throw new Error(`${index + 2}행의 ${key} 값을 확인해 주세요.`);
                result[key] = number;
            }
        }
        return result;
    });
}

// 모멘텀 열이 없으면 해당 날짜까지 관측된 종가만으로 보완한다.
export function withHistoricalMomentum(rows: ResearchRow[]): ResearchRow[] {
    const history = new Map<string, number[]>();
    return [...rows].sort((a, b) => a.date.localeCompare(b.date) || a.ticker.localeCompare(b.ticker)).map(row => {
        if (!history.has(row.ticker)) history.set(row.ticker, []);
        const prices = history.get(row.ticker)!;
        prices.push(row.close);
        const result = { ...row };
        for (const [key, period] of [['momentum20', 20], ['momentum60', 60]] as const) {
            const previous = prices[prices.length - period - 1];
            if (result[key] == null && prices.length > period && previous > 0) result[key] = (row.close / previous - 1) * 100;
        }
        return result;
    });
}

export function backtestFactors(rows: ResearchRow[], rules: FactorRule[], topN: number, rebalance: number, costBps: number) {
    if (!Number.isInteger(topN) || topN < 1 || topN > 100 || !Number.isInteger(rebalance) || rebalance < 1 || !Number.isFinite(costBps) || costBps < 0 || costBps > 500) throw new Error('보유 수·리밸런싱 주기·거래 비용을 확인해 주세요.');
    const snapshots = new Map<string, ResearchRow[]>();
    for (const row of withHistoricalMomentum(rows)) {
        if (!snapshots.has(row.date)) snapshots.set(row.date, []);
        snapshots.get(row.date)!.push(row);
    }
    const dates = [...snapshots.keys()].sort();
    if (dates.length < 3) throw new Error('과거 검증에는 서로 다른 날짜의 스냅샷이 3개 이상 필요합니다.');
    rankFactors([], rules); // 빈 날짜에도 잘못된 조건을 먼저 거절한다.
    let cash = 1, holdings = new Map<string, number>(), peak = 1, mdd = 0, totalCosts = 0, trades = 0;
    const curve = [{ date: dates[0], value: 1, holdings: [] as string[], signalDate: '' }];
    for (let i = 1; i < dates.length; i++) {
        const current = new Map(snapshots.get(dates[i])!.map(row => [row.ticker, row]));
        const quote = (ticker: string) => {
            const price = current.get(ticker)?.close;
            if (price == null) throw new Error(`${dates[i]} ${ticker}: 보유·매수 종목의 가격이 없습니다. 누락 종목을 임의로 제외하지 않습니다.`);
            return price;
        };
        const positions = new Map([...holdings].map(([ticker, shares]) => [ticker, shares * quote(ticker)]));
        let value = cash + [...positions.values()].reduce((sum, amount) => sum + amount, 0);
        let signalDate = '';
        if ((i - 1) % rebalance === 0 && value > 0) {
            signalDate = dates[i - 1];
            const targets = rankFactors(snapshots.get(signalDate)!, rules).filter(row => row.close > 0).slice(0, topN);
            for (const target of targets) if (quote(target.ticker) <= 0) throw new Error(`${dates[i]} ${target.ticker}: 매수 가능한 가격이 아닙니다.`);
            const names = new Set(targets.map(row => row.ticker));
            const all = new Set([...names, ...positions.keys()]);
            const turnover = (net: number) => [...all].reduce((sum, ticker) => sum + Math.abs((names.has(ticker) ? net / names.size : 0) - (positions.get(ticker) ?? 0)), 0);
            const rate = costBps / 10000;
            let net = value;
            // 비용 차감 후 동일 비중이 되도록 거래 금액과 비용을 함께 푼다.
            for (let j = 0; j < 30; j++) net = Math.max(0, value - turnover(net) * rate);
            const cost = value - net;
            if (turnover(net) > 1e-10) trades++;
            totalCosts += cost; value = net;
            holdings = new Map(targets.map(row => [row.ticker, net / targets.length / quote(row.ticker)]));
            cash = targets.length ? 0 : net;
        }
        peak = Math.max(peak, value); mdd = Math.min(mdd, value / peak - 1);
        curve.push({ date: dates[i], value, holdings: [...holdings.keys()], signalDate });
    }
    const final = curve.at(-1)!.value;
    const years = (Date.parse(dates.at(-1)!) - Date.parse(dates[0])) / (365.25 * 86400000);
    return { curve, totalReturn: (final - 1) * 100, cagr: years >= 1 ? (Math.pow(final, 1 / years) - 1) * 100 : null, mdd: mdd * 100, totalCosts: totalCosts * 100, trades };
}
