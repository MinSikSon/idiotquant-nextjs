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
