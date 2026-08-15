// 리서치 도구가 그리는 선. 종가 배열만 받는 순수 함수다.
//
// 값이 없는 구간(앞쪽 period-1 개)은 null 로 둔다 — 0 을 넣으면 차트가 바닥까지 떨어진다.

/** 단순이동평균. 앞쪽 period-1 개는 계산할 수 없어 null. */
export function movingAverage(closes: number[], period: number): (number | null)[] {
    const out: (number | null)[] = [];
    let sum = 0;
    for (let i = 0; i < closes.length; i++) {
        sum += closes[i];
        if (i >= period) sum -= closes[i - period];
        out.push(i >= period - 1 ? Math.round(sum / period) : null);
    }
    return out;
}

/** 돌파선 — 지난 period 일의 최고가·최저가. 오늘을 포함한다(오늘 신고가면 오늘 값이 상단). */
export function donchian(highs: number[], lows: number[], period = 20): {
    upper: (number | null)[]; lower: (number | null)[];
} {
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];
    for (let i = 0; i < highs.length; i++) {
        if (i < period - 1) { upper.push(null); lower.push(null); continue; }
        upper.push(Math.max(...highs.slice(i - period + 1, i + 1)));
        lower.push(Math.min(...lows.slice(i - period + 1, i + 1)));
    }
    return { upper, lower };
}

/**
 * 변동폭 — 최근 period 일의 하루 폭(True Range) 평균을 종가 위아래로 그린다.
 *
 * True Range 는 전날 종가까지 셈에 넣는다. 갭으로 뛴 날은 고가−저가만으로는 실제로 움직인
 * 폭이 안 나오기 때문이다.
 */
export function atrBand(
    candles: { o: number; h: number; l: number; c: number }[], period = 14,
): { upper: (number | null)[]; lower: (number | null)[] } {
    const tr: number[] = [];
    for (let i = 0; i < candles.length; i++) {
        const { h, l, c } = candles[i];
        const pc = i > 0 ? candles[i - 1].c : c;
        tr.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
    }
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];
    let sum = 0;
    for (let i = 0; i < candles.length; i++) {
        sum += tr[i];
        if (i >= period) sum -= tr[i - period];
        if (i < period - 1) { upper.push(null); lower.push(null); continue; }
        const atr = sum / period;
        upper.push(Math.round(candles[i].c + atr));
        lower.push(Math.round(candles[i].c - atr));
    }
    return { upper, lower };
}

/** 볼린저밴드 — 이동평균 ± 표준편차 × mult. */
export function bollinger(closes: number[], period = 20, mult = 2): {
    upper: (number | null)[]; lower: (number | null)[];
} {
    const upper: (number | null)[] = [];
    const lower: (number | null)[] = [];
    for (let i = 0; i < closes.length; i++) {
        if (i < period - 1) { upper.push(null); lower.push(null); continue; }
        const win = closes.slice(i - period + 1, i + 1);
        const mean = win.reduce((a, b) => a + b, 0) / period;
        const sd = Math.sqrt(win.reduce((a, b) => a + (b - mean) ** 2, 0) / period);
        upper.push(Math.round(mean + sd * mult));
        lower.push(Math.round(mean - sd * mult));
    }
    return { upper, lower };
}
