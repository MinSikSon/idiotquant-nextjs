/**
 * 월별 잔액 — 자산·부채, 그리고 **달별 증감.**
 *
 * ── 흐름과 잔고 ───────────────────────────────────────────────
 * 가계부의 내역(`ledgerAPI.LedgerEntry`)은 하루하루의 수입·지출, 곧 **흐름**이다.
 * 여기 있는 것은 달이 끝난 시점의 자산과 부채, 곧 **잔고**다. 흐름을 아무리 더해도
 * 잔고가 안 나온다 — 시세가 오른 집값도 아직 안 갚은 대출도 수입·지출로는 한 번도
 * 안 지나가기 때문이다.
 *
 * ── 순자산은 값이 아니라 뺄셈이다 ─────────────────────────────
 * 워커도 D1 도 순자산을 안 담는다. 자산 − 부채로 언제나 나오는 값이라, 담아 두면
 * 셋이 서로 안 맞는 달이 생기고(자산 1억 / 부채 3천 / 순자산 8천) 그때 어느 쪽이
 * 맞는지 알 방법이 없다. **뺄셈하는 자리는 이 파일 하나다.**
 */

/** 워커가 돌려주는 한 달치. 순자산은 여기 없다 — 위 주석 참고. */
export interface LedgerBalance {
    month: string;          // 'YYYY-MM'
    assets: number;         // 원 단위 0 이상
    liabilities: number;    // 원 단위 0 이상
    updated_by?: string | null;
    updated_by_name?: string | null;
    updated_at?: number | null;
}

/** 순자산. **이 게 유일한 정의다** — 화면이 따로 빼지 않는다. */
export const netWorth = (b: Pick<LedgerBalance, "assets" | "liabilities">) =>
    b.assets - b.liabilities;

/** 차트가 그리는 한 점. */
export interface BalancePoint {
    month: string;
    assets: number;
    liabilities: number;
    /** 자산 − 부채. */
    net: number;
    /**
     * **바로 앞 달**의 순자산 대비 증감. 앞 달이 안 적혀 있으면 `null`.
     *
     * `0` 이 아니라 `null` 인 것이 중요하다 — 0 은 「그대로였다」이고 null 은
     * 「견줄 것이 없다」다. 둘을 같게 두면 첫 달에 「변화 없음」 막대가 서서,
     * 아무것도 모르는 자리가 아는 것처럼 보인다.
     */
    delta: number | null;
}

/** 'YYYY-MM' 의 한 달 전. */
export function prevMonth(month: string): string {
    const [y, m] = month.split("-").map(Number);
    const d = m === 1 ? { y: y - 1, m: 12 } : { y, m: m - 1 };
    return `${d.y}-${String(d.m).padStart(2, "0")}`;
}

/** 'YYYY-MM' 에서 `n` 달 전. `n` 이 0 이면 그대로. */
export function monthsBefore(month: string, n: number): string {
    let cur = month;
    for (let i = 0; i < n; i++) cur = prevMonth(cur);
    return cur;
}

/**
 * 차트가 한 번에 보는 구간. **보고 있는 달을 포함해 뒤로 이만큼.**
 *
 * 상한이 3년인 것은 **차트가 폭에 맞춰 그려지기 때문**이다. 더 멀리 잡으면 막대가
 * 실오라기가 되어 견주는 뜻이 사라진다(옆으로 스크롤하게 두면 세로 눈금까지 같이
 * 밀려 나가고, 값 축이 없는 막대 차트는 읽을 수가 없다). 그보다 옛날은 보고 있는
 * 달을 옮겨서 본다.
 */
export const BALANCE_RANGES = [
    { months: 12, label: "1년" },
    { months: 24, label: "2년" },
    { months: 36, label: "3년" },
] as const;

export const DEFAULT_BALANCE_RANGE = 12;

/** 구간의 시작 달. 끝은 언제나 보고 있는 달이다. */
export const rangeStart = (month: string, months: number) =>
    monthsBefore(month, Math.max(1, months) - 1);

/**
 * 적힌 달들을 차트가 읽는 점으로 바꾼다. 들어온 순서와 무관하게 **달 순으로** 낸다.
 *
 * ── 증감은 「바로 앞 달」하고만 견준다 ────────────────────────
 * 1월과 3월만 적혀 있을 때 3월을 1월과 견주면, **두 달치 변화가 한 달치 증감으로**
 * 화면에 선다. 그건 틀린 숫자이고, 더 나쁘게는 틀린 줄 모른다. 그래서 바로 앞
 * 달이 안 적혀 있으면 증감을 안 낸다 — 그 달 막대가 비는 것이 「견줄 앞 달이 없다」를
 * 그대로 말한다.
 *
 * 빠짐없이 적는 사람에게는 이 규칙이 아무것도 바꾸지 않는다.
 */
export function balancePoints(rows: readonly LedgerBalance[]): BalancePoint[] {
    const sorted = [...rows].sort((a, b) => a.month.localeCompare(b.month));
    const netByMonth = new Map(sorted.map(r => [r.month, netWorth(r)]));

    return sorted.map((r) => {
        const before = netByMonth.get(prevMonth(r.month));
        return {
            month: r.month,
            assets: r.assets,
            liabilities: r.liabilities,
            net: netWorth(r),
            delta: before === undefined ? null : netWorth(r) - before,
        };
    });
}
