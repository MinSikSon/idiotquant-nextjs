// 캠페인 표기 (클라이언트 판).
//
// 워커의 src/lib/campaign.js 와 짝이다. 여기는 화면에 이름을 적는 데만 쓰고, 창 계산과
// 검증은 전부 워커에서 한다 — 날짜 계산이 두 곳에 있으면 어긋나는 날이 온다.
// 그래도 이 상수들은 같아야 한다(고를 수 있는 기간, 반기 라벨).

export const YEAR_CHOICES = [1, 2, 3, 5, 10, 15, 20];
export const HALVES_PER_YEAR = 8;
export const HALF_SPAN_DAYS = 45;

/** "1-1" … "4-2". 앞이 분기, 뒤가 전(1)·후(2) 반기. */
export function halfLabel(halfIndex: number): string {
    const i = Math.max(0, Math.floor(Number(halfIndex) || 0)) % HALVES_PER_YEAR;
    return `${Math.floor(i / 2) + 1}-${(i % 2) + 1}`;
}

/** 몇 년차의 어느 반기인가. year 는 1부터. */
export function halfOf(halfIndex: number): { year: number; label: string; quarter: number; half: number } {
    const i = Math.max(0, Math.floor(Number(halfIndex) || 0));
    return {
        year: Math.floor(i / HALVES_PER_YEAR) + 1,
        label: halfLabel(i),
        quarter: Math.floor((i % HALVES_PER_YEAR) / 2) + 1,
        half: (i % 2) + 1,
    };
}

export function totalHalves(years: number): number {
    return Math.max(1, Math.floor(Number(years) || 0)) * HALVES_PER_YEAR;
}
