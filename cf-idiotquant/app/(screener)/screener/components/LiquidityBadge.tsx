"use client";

// 유동성·거래정지 표시.
// 스크리너는 종목을 네 가지 뷰(비율·카드·데스크탑 표·모바일 표)로 그리는데, 어느 뷰로 보든
// "이 종목을 실제로 담을 수 있는가"는 같은 자리에 같은 모양으로 서야 한다 → 여기 한 곳에 둔다.
// 판정에 쓰는 값(trAmtEok·isHalted)도 같이 두어 필터와 배지가 다른 기준을 쓰는 일이 없게 한다.

/** 누적 거래대금(원) → 억원. 값이 없으면 null — "거래대금 0원"과 "아직 수집 안 됨"은 다르다. */
export function trAmtEok(i: any): number | null {
    const v = i?.acml_tr_pbmn;
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n / 1e8 : null;
}

export function isHalted(i: any): boolean {
    return String(i?.temp_stop_yn ?? "").toUpperCase() === "Y";
}

/** 하루 거래대금이 이보다 적으면 원하는 수량을 한 번에 담기 어렵다 */
export const LOW_TR_AMT_EOK = 3;

// 정상 종목에는 아무것도 붙이지 않는다 — 모든 행에 배지가 달리면 신호가 아니라 잡음이 된다.
// 표에 열을 새로 만들지 않은 이유: 데스크탑 표는 이미 7열 고정폭이라 한 열을 더하면 좁은
// 노트북에서 눌리고, 카드 뷰에는 그 열이 아예 없어 같은 정보가 한쪽에만 생긴다.
export function LiquidityBadge({ item }: { item: any }) {
    if (isHalted(item)) {
        return (
            <span className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-400 whitespace-nowrap">
                거래정지
            </span>
        );
    }
    const v = trAmtEok(item);
    if (v === null || v >= LOW_TR_AMT_EOK) return null;
    return (
        <span
            title={`하루 거래대금 약 ${v.toFixed(1)}억원 — 원하는 수량을 한 번에 담기 어렵습니다`}
            className="px-1.5 py-0.5 rounded text-[9.5px] font-black bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 whitespace-nowrap"
        >
            거래 {v.toFixed(1)}억
        </span>
    );
}
